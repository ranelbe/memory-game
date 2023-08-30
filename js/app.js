(function () {
    const NO_OF_IMAGES = 16;
    const NO_OF_HIGH_SCORES = 3;
    const HIGH_SCORES = 'highScores';

    /**
     * save the game settings, clear the menu, and start the game
     * @param e - the event 'gameMenu'
     */
    function startGame(e) {
        const data = { // save the necessary data
            mainContainer: document.getElementById('mainContainer'),
            playerName: document.getElementById('playerName').value.trim().toLowerCase(),
            gridDimensions: {
                rows: document.getElementById('rowsSelection').value,
                columns: document.getElementById('columnsSelection').value,
                size: function () {
                    return this.rows * this.columns;
                }
            },
            delay: document.getElementById('delaySelection').value,
        }

        e.target.innerHTML = ''; // clear the menu
        data.mainContainer.innerHTML = constructGameWindow(data); // construct the game window

        gridListener(data);
        backToMenuListener(data);
    }

    /**
     * create HTML code for the game window
     * @param data
     * @returns {string} - game window HTML code
     */
    function constructGameWindow(data) {
        let stepsCounterHTML = '<div class="fs-5 my-3">Steps: <span id="stepsCounter">0</span></div>';
        let gridHTML = constructGrid(data);
        let abandonButtonHTML = '<button type="button" class="btn btn-primary my-3 backToMenuButton">Abandon</button>';
        return stepsCounterHTML.concat(gridHTML, abandonButtonHTML);
    }

    /**
     * create HTML code for the grid
     * @param data
     * @returns {string} - grid HTML code
     */
    function constructGrid(data) {
        let gridHTML = '<div class="container w-50">';
        for (let i = 0; i < data.gridDimensions.rows; i++) {
            gridHTML += '<div class="row g-0">' // new row
            for (let j = 0; j < data.gridDimensions.columns; j++) {
                gridHTML += '<div class="col">' + //new tile
                    '<div class="card p-2">' +
                    // image set to be `?`
                    '<img class="img-fluid card-img" src="images/card.jpg" alt="card">' +
                    '</div></div>';
            }
            gridHTML += '</div>';
        }
        gridHTML += '</div>';
        return gridHTML;
    }

    /**
     * create array of shuffled images sources
     * @param imagesAmount
     * @returns {*} array of shuffled images sources
     */
    function generateRandomImages(imagesAmount) {
        const gridImages = new Set(); //to avoid duplications
        // generate imagesAmount/2 different images sources
        while (gridImages.size !== imagesAmount / 2) {
            gridImages.add(`${Math.floor(Math.random() * NO_OF_IMAGES)}.jpg`);
        }
        return shuffle([...gridImages, ...gridImages]); // duplicate and shuffle the images
    }

    /**
     * Fisher–Yates algorithm for mixing the array
     * @param arr
     * @returns {*} shuffled array
     */
    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * calculate the player score
     * @param data
     * @returns {number} - the score of the player
     */
    function calculateScore(data) {
        return Math.floor(10 * (1000 / data.delay) *
            ((data.gridDimensions.size()*data.gridDimensions.size()) / data.stepsCounter));
    }

    /**
     * create HTML code for the leaderboard
     * @returns {string} - leaderboard HTML code
     */
    function showHighScores() {
        const highScores = JSON.parse(localStorage.getItem(HIGH_SCORES)) ?? [];
        let htmlTable = '<table class="table table-striped">' +
            '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';
        htmlTable += highScores.map((score, i) =>
            `<tr><td>${i + 1}</td><td>${score.name}</td><td>${score.score}</td></tr>`)
            .join('');
        htmlTable += '</table>';
        return htmlTable;
    }

    /**
     * replace player score in the high scores table
     * @param highScores
     * @param i
     * @param score
     */
    function replaceHighScore(highScores, i, score) {
        highScores[i] = score;
        highScores.sort((a, b) => b.score-a.score);
        localStorage.setItem(HIGH_SCORES, JSON.stringify(highScores));
    }

    /**
     * add player score to the high scores table
     * @param highScores
     * @param score
     */
    function addHighScore(highScores, score) {
        highScores.push(score);
        highScores.sort((a, b) => b.score-a.score);
        highScores.splice(NO_OF_HIGH_SCORES);
        localStorage.setItem(HIGH_SCORES, JSON.stringify(highScores));
    }

    /**
     * insert a player into the high scores table if necessary
     * @param score
     * @returns {string} - informative message to the player to let him know if he enters the table
     */
    function checkHighScore(score) {
        const highScores = JSON.parse(localStorage.getItem(HIGH_SCORES)) ?? [];
        const lowestScore = highScores[NO_OF_HIGH_SCORES-1]?.score ?? 0;
        const found = highScores.find(s => s.name === score.name); // look for the same name

        // same name exist already
        if(found) {
            // player improved his result
            if(found.score < score.score) {
                replaceHighScore(highScores,highScores.indexOf(found),score);
                return `You are ranked ${highScores.indexOf(score)+1} out of ${highScores.length}`;
            }
            return 'You did not improve your previous result :(';
        }
        // new record
        if (score.score > lowestScore) {
            addHighScore(highScores,score);
            return `You are ranked ${highScores.indexOf(score)+1} out of ${highScores.length}`;
        }
        return `You are too bad to enter our leaderboard table!`;
    }

    /**
     * display game over screen
     * @param data
     */
    function gameOver(data) {
        data.mainContainer.innerHTML = ''; // stop the game
        const score = {
            name: data.playerName,
            score: calculateScore(data)
        };
        const msg = checkHighScore(score);
        data.mainContainer.innerHTML = '<h1>Game Over!</h1>' +
            `<p>Player: ${data.playerName}</p>`+
            `<p>Number of cards played: ${data.gridDimensions.size()}</p>` +
            `<p>Score: ${score.score} - ${msg}</p>` + showHighScores() +
            '<button type="button" class="btn btn-primary my-2 backToMenuButton">Ok</button>';
        backToMenuListener(data);
    }

    /**
     * listen for clicks on the grid (the game logic)
     * @param data
     */
    function gridListener(data) {
        const randomImages = generateRandomImages(data.gridDimensions.size());
        const cards = document.getElementsByClassName('card-img');
        let flippedCards = 0, stepsCounter = 0;
        let selected = [], twoCardsSelected = false;

        // listen for each card clicks
        [...cards].forEach((card, i) => {
            card.addEventListener('click', (e) => {
                if (!twoCardsSelected) {
                    if (selected.length < 2 && !selected.includes(e.target)) {
                        document.getElementById('stepsCounter').innerText = (++stepsCounter).toString();
                        e.target.src = `images/${randomImages[i]}`; // change the image source
                        selected.push(e.target);
                    }
                    if (selected.length === 2) {
                        twoCardsSelected = true;
                        if (selected[0].src === selected[1].src) {
                            flippedCards += 2;
                            selected[0].classList.add('pe-none'); //block this card
                            selected[1].classList.add('pe-none');
                            selected = [];
                            twoCardsSelected = false;
                        } else {
                            setTimeout(() => { // after time out flip the cards back to '?'
                                selected[0].src = selected[1].src = "images/card.jpg";
                                selected = [];
                                twoCardsSelected = false;
                            }, data.delay);
                        }
                    }
                }
                // check for game over
                if (flippedCards === data.gridDimensions.size()) {
                    data.stepsCounter = stepsCounter;
                    gameOver(data);
                }
            });
        });
    }

    /**
     * listen for return to menu buttons
     * @param data
     */
    function backToMenuListener(data) {
        document.querySelector('.backToMenuButton').addEventListener('click', () => {
            data.mainContainer.innerHTML = ''; // clear the screen
            location.reload(); // display the menu
            document.getElementById('recordsTable').innerHTML = showHighScores();
            menuListener();
        });
    }

    /**
     * validate that rows*cols is even
     * @param target
     * @param other
     */
    function validation(target, other) {
        const playButton = document.getElementById('playButton');
        if (target.value * other.value % 2 !== 0) { // odd - display error
            playButton.disabled = true;
            target.nextElementSibling.classList.replace('d-none', 'd-block');
        } else { // even  - remove errors
            playButton.disabled = false;
            target.nextElementSibling.classList.replace('d-block', 'd-none');
            other.nextElementSibling.classList.replace('d-block', 'd-none');
        }
    }

    /**
     * listen for the changes in the menu
     */
    function menuListener() {
        const rowsSelection = document.getElementById('rowsSelection');
        const columnsSelection = document.getElementById('columnsSelection');

        rowsSelection.addEventListener('change', (e) => { // rows changes listener
            validation(e.target, columnsSelection);
        });
        columnsSelection.addEventListener('change', (e) => { // columns changes listener
            validation(e.target, rowsSelection);
        });

        // play button listener
        document.getElementById("gameMenu").addEventListener("submit", (e) => {
            e.preventDefault();
            startGame(e);
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        document.getElementById('recordsTable').innerHTML = showHighScores();
        menuListener();
    });

})();