// 1. Setup API configuration and Daily State Variables
const API_KEY = "a24cbba3b16a5ea825ec42ac4e4c8d52"; 
let SECRET_MOVIE = null;
let dailyMoviePool = []; 

const searchInput = document.getElementById("movie-search");
const dropdown = document.getElementById("dropdown-results");
const feed = document.getElementById("guesses-feed");

// 2. Fetch a global list of movies safely for the Daily Target Picker
async function initGame() {
    try {
        let moviePromises = [];
        // Fetching 3 pages (60 movies) to prevent network rate-limiting crashes
        for (let page = 1; page <= 3; page++) {
            moviePromises.push(
                fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&vote_count.gte=50&page=${page}`)
                .then(res => {
                    if (!res.ok) return { results: [] }; // Gracefully handle a single page failure
                    return res.json();
                })
                .catch(() => { return { results: [] }; }) // Catch network drops safely
            );
        }
        
        let results = await Promise.all(moviePromises);
        dailyMoviePool = results.flatMap(data => data.results || []);

        // Filter out any undefined or broken entries just in case
        dailyMoviePool = dailyMoviePool.filter(m => m && m.id);

        if (dailyMoviePool.length > 0) {
            await setDailyMovie();
        } else {
            document.getElementById("hint-text").innerText = "Error loading movie pool. Check your internet connection.";
        }
    } catch (err) {
        console.error("Error loading movie library:", err);
        document.getElementById("hint-text").innerText = "Failed to load game data.";
    }
}

// 3. Mathematical Formula to pick one synchronized movie per calendar day
async function setDailyMovie() {
    try {
        const today = new Date();
        const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        
        const targetIndex = dateSeed % dailyMoviePool.length;
        const basicMovieInfo = dailyMoviePool[targetIndex];

        // Request deep credits to uncover the Director's name using the movie ID
        const detailRes = await fetch(`https://api.themoviedb.org/3/movie/${basicMovieInfo.id}?api_key=${API_KEY}&append_to_response=credits`);
        const details = await detailRes.json();

        const directorObj = details.credits?.crew?.find(member => member.job === "Director");
        const mainGenre = details.genres?.length > 0 ? details.genres[0].name : "Unknown";

        SECRET_MOVIE = {
            id: details.id,
            title: details.title.toUpperCase(),
            year: parseInt(details.release_date?.split("-")[0]) || 0,
            genre: mainGenre,
            director: directorObj ? directorObj.name : "Unknown",
            poster: details.poster_path ? `https://image.tmdb.org/t/p/w200${details.poster_path}` : ""
        };

        // Clean hint system that completely protects the broad structure
        document.getElementById("hint-text").innerText = `Daily Hint: A popular ${SECRET_MOVIE.genre} movie released in ${SECRET_MOVIE.year}.`;
    } catch (err) {
        console.error("Error setting daily movie:", err);
        document.getElementById("hint-text").innerText = "Failed to load game data.";
    }
}

// 4. Live Search Input Autocomplete querying TMDB's live global database directly
searchInput.addEventListener("input", async () => {
    let query = searchInput.value.trim();
    dropdown.innerHTML = "";
    if (query.length < 2) return;

    try {
        // Query TMDB directly for anything matching the input text globally
        let res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`);
        let data = await res.json();
        let searchResults = data.results || [];

        // Filter out completely obscure things with no votes or no release date to keep search clean
        let filtered = searchResults.filter(m => m.release_date && m.vote_count >= 5).slice(0, 8);
        
        filtered.forEach(movie => {
            let movieYear = movie.release_date.split("-")[0];
            let item = document.createElement("div");
            item.classList.add("dropdown-item");
            item.innerText = `${movie.title} (${movieYear})`;
            
            // Pass the explicit movie ID directly to the guess loader
            item.addEventListener("click", () => fetchAndSubmitGuess(movie.id));
            dropdown.appendChild(item);
        });
    } catch (err) {
        console.error("Live search request failed:", err);
    }
});

// 5. Fetch complete details for the user's selected movie guess
async function fetchAndSubmitGuess(movieId) {
    try {
        let res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits`);
        let d = await res.json();
        let dir = d.credits?.crew?.find(m => m.job === "Director");
        
        submitGuess({
            title: d.title.toUpperCase(),
            year: parseInt(d.release_date?.split("-")[0]) || 0,
            genre: d.genres?.length > 0 ? d.genres[0].name : "Unknown",
            director: dir ? dir.name : "Unknown",
            poster: d.poster_path ? `https://image.tmdb.org/t/p/w200${d.poster_path}` : ""
        });
    } catch (err) {
        console.error("Error processing guess selection:", err);
    }
}

// 6. Build Result Comparison Rows
function submitGuess(guessedMovie) {
    searchInput.value = "";
    dropdown.innerHTML = "";

    let row = document.createElement("div");
    row.classList.add("guess-row");

    // Poster block
    let posterBlock = document.createElement("div");
    posterBlock.classList.add("poster-block");
    if (guessedMovie.poster) {
        posterBlock.style.backgroundImage = `url('${guessedMovie.poster}')`;
    }
    row.appendChild(posterBlock);

    // Title Check
    row.appendChild(createInfoBlock(guessedMovie.title, guessedMovie.title === SECRET_MOVIE.title));

    // Year Check with arrow indicators
    let yearStatus = "absent";
    let displayYear = guessedMovie.year;
    if (guessedMovie.year === SECRET_MOVIE.year) {
        yearStatus = "correct";
    } else {
        displayYear += guessedMovie.year < SECRET_MOVIE.year ? " ⬆️" : " ⬇️";
    }
    row.appendChild(createInfoBlock(displayYear, yearStatus));

    // Genre Check
    row.appendChild(createInfoBlock(guessedMovie.genre, guessedMovie.genre === SECRET_MOVIE.genre));

    // Director Check
    row.appendChild(createInfoBlock(guessedMovie.director, guessedMovie.director === SECRET_MOVIE.director));

    feed.insertBefore(row, feed.firstChild);

    if (guessedMovie.title === SECRET_MOVIE.title) {
        setTimeout(() => alert("Masterful guessing! You found today's hidden movie! 🎬🎉"), 200);
    }
}

// Helper function to create blocks
function createInfoBlock(text, statusClass) {
    let block = document.createElement("div");
    block.classList.add("info-block");
    if (statusClass === true) block.classList.add("correct");
    else if (statusClass === false) block.classList.add("absent");
    else block.classList.add(statusClass);
    block.innerText = text;
    return block;
}

// Start the setup loop
initGame();
