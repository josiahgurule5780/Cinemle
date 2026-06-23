// 1. Data Pool containing deep properties and images for each movie
const MOVIE_POOL = [
    {
        title: "SHREK",
        year: 2001,
        genre: "Animation",
        director: "Adamson",
        hint: "An ogre finds love in a swamp.",
        poster: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=150" // Replace with actual poster URLs later
    },
    {
        title: "AVATAR",
        year: 2009,
        genre: "Sci-Fi",
        director: "Cameron",
        hint: "Blue aliens protecting their home tree from miners.",
        poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=150"
    },
    {
        title: "JAWS",
        year: 1975,
        genre: "Thriller",
        director: "Spielberg",
        hint: "You're gonna need a bigger boat.",
        poster: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=150"
    },
    {
        title: "INCEPTION",
        year: 2010,
        genre: "Sci-Fi",
        director: "Nolan",
        hint: "Stealing secrets from inside a dream within a dream.",
        poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=150"
    }
];

// Select the secret target movie
const SECRET_MOVIE = MOVIE_POOL[Math.floor(Math.random() * MOVIE_POOL.length)];

// Update hint box right away
document.getElementById("hint-text").innerText = `Hint: ${SECRET_MOVIE.hint}`;

const searchInput = document.getElementById("movie-search");
const dropdown = document.getElementById("dropdown-results");
const feed = document.getElementById("guesses-feed");

// 2. Filter list when typing
searchInput.addEventListener("input", () => {
    let value = searchInput.value.toUpperCase();
    dropdown.innerHTML = "";
    
    if (!value) return;

    let filtered = MOVIE_POOL.filter(movie => movie.title.includes(value));
    
    filtered.forEach(movie => {
        let item = document.createElement("div");
        item.classList.add("dropdown-item");
        item.innerText = movie.title;
        item.addEventListener("click", () => submitGuess(movie));
        dropdown.appendChild(item);
    });
});

// 3. Evaluate the selection (LoLdle evaluation row)
function submitGuess(guessedMovie) {
    // Clear search box
    searchInput.value = "";
    dropdown.innerHTML = "";

    // Create a row container
    let row = document.createElement("div");
    row.classList.add("guess-row");

    // Block 1: Poster Cover
    let posterBlock = document.createElement("div");
    posterBlock.classList.add("poster-block");
    posterBlock.style.backgroundImage = `url('${guessedMovie.poster}')`;
    row.appendChild(posterBlock);

    // Block 2: Title Evaluation
    let titleBlock = createInfoBlock(guessedMovie.title, guessedMovie.title === SECRET_MOVIE.title);
    row.appendChild(titleBlock);

    // Block 3: Year Evaluation (Shows directional indicator arrows too)
    let yearStatus = "absent";
    let displayYear = guessedMovie.year;
    if (guessedMovie.year === SECRET_MOVIE.year) {
        yearStatus = "correct";
    } else {
        displayYear += guessedMovie.year < SECRET_MOVIE.year ? " ⬆️" : " ⬇️";
    }
    let yearBlock = createInfoBlock(displayYear, yearStatus);
    row.appendChild(yearBlock);

    // Block 4: Genre Evaluation
    let genreBlock = createInfoBlock(guessedMovie.genre, guessedMovie.genre === SECRET_MOVIE.genre);
    row.appendChild(genreBlock);

    // Block 5: Director Evaluation
    let directorBlock = createInfoBlock(guessedMovie.director, guessedMovie.director === SECRET_MOVIE.director);
    row.appendChild(directorBlock);

    // Add row to the top of our list
    feed.insertBefore(row, feed.firstChild);

    // Check Win Condition
    if (guessedMovie.title === SECRET_MOVIE.title) {
        setTimeout(() => alert("You Found the Movie! 🎬🎉"), 200);
    }
}

// Helper function to build color tiles cleanly
function createInfoBlock(text, statusClass) {
    let block = document.createElement("div");
    block.classList.add("info-block");
    
    if (statusClass === true) block.classList.add("correct");
    else if (statusClass === false) block.classList.add("absent");
    else block.classList.add(statusClass); // Manual tag passing (like 'present')

    block.innerText = text;
    return block;
}
