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
        for (let page = 1; page <= 3; page++) {
            moviePromises.push(
                fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&vote_count.gte=50&page=${page}`)
                .then(res => {
                    if (!res.ok) return { results: [] };
                    return res.json();
                })
                .catch(() => { return { results: [] }; })
            );
        }
        
        let results = await Promise.all(moviePromises);
        dailyMoviePool = results.flatMap(data => data.results || []);
        dailyMoviePool = dailyMoviePool.filter(m => m && m.id);

        if (dailyMoviePool.length > 0) {
            await setDailyMovie();
        } else {
            updateHintText("Error loading movie pool. Check your internet connection.");
        }
    } catch (err) {
        console.error("Error loading movie library:", err);
        updateHintText("Failed to load game data.");
    }
}

// Helper to update hint safely
function updateHintText(text) {
    const hintElement = document.getElementById("hint-text") || document.querySelector('.hint-box') || document.querySelector('div blockquote');
    if (hintElement) {
        hintElement.innerText = text;
    }
}

// 3. Mathematical Formula to pick one synchronized movie per calendar day
async function setDailyMovie() {
    try {
        const today = new Date();
        const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        
        const targetIndex = dateSeed % dailyMoviePool.length;
        const basicMovieInfo = dailyMoviePool[targetIndex];

        await loadTargetDetails(basicMovieInfo.id);
        loadSavedGuesses(dateSeed);

    } catch (err) {
        console.error("Error setting daily movie:", err);
        updateHintText("Failed to load game data.");
    }
}

// Helper to pull complete target details from TMDB
async function loadTargetDetails(movieId) {
    const detailRes = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits`);
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

    updateHintText(`Daily Hint: A popular ${SECRET_MOVIE.genre} movie released in ${SECRET_MOVIE.year}.`);
}

// 4. Live Search Input Autocomplete & Hidden Dev Passcode Hook
if (searchInput) {
    searchInput.addEventListener("input", async () => {
        let query = searchInput.value.trim();
        
        // --- SECRET PASSCODE TRIGGER ---
        if (query.toUpperCase() === "DEVPANEL99") {
            searchInput.value = ""; 
            if (dropdown) dropdown.innerHTML = "";
            launchDevPanel();
            return; 
        }

        if (!dropdown) return;
        dropdown.innerHTML = "";
        if (query.length < 2) return;

        try {
            let res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`);
            let data = await res.json();
            let searchResults = data.results || [];

            let filtered = searchResults.filter(m => m.release_date && m.vote_count >= 5).slice(0, 8);
            
            filtered.forEach(movie => {
                let movieYear = movie.release_date.split("-")[0];
                let item = document.createElement("div");
                item.classList.add("dropdown-item");
                item.innerText = `${movie.title} (${movieYear})`;
                
                item.addEventListener("click", () => fetchAndSubmitGuess(movie.id, true));
                dropdown.appendChild(item);
            });
        } catch (err) {
            console.error("Live search request failed:", err);
        }
    });
}

// --- VISUAL DEV PANEL ENGINE ---
function launchDevPanel() {
    if (document.getElementById("admin-dev-overlay")) return;

    let overlay = document.createElement("div");
    overlay.id = "admin-dev-overlay";
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,15,20,0.98); z-index:9999; color:#fff; font-family:sans-serif; padding:30px; box-sizing:border-box; overflow-y:auto;";

    let title = document.createElement("h2");
    title.innerText = "🛠️ SYSTEM DEVELOPER CONTROL PANEL";
    title.style.borderBottom = "2px solid #333";
    title.style.paddingBottom = "10px";
    overlay.appendChild(title);

    let infoBox = document.createElement("div");
    infoBox.id = "dev-info-box";
    infoBox.style = "background:#222; padding:15px; border-radius:8px; margin:20px 0; font-size:16px; line-height:1.6; display:none;";
    overlay.appendChild(infoBox);

    let btnInfo = document.createElement("button");
    btnInfo.innerText = "👁️ Show / Hide Target Data";
    styleDevButton(btnInfo, "#4a5568");
    btnInfo.onclick = () => {
        if (infoBox.style.display === "none") {
            infoBox.style.display = "block";
            infoBox.innerHTML = `
                <strong>TITLE:</strong> ${SECRET_MOVIE.title}<br>
                <strong>YEAR:</strong> ${SECRET_MOVIE.year}<br>
                <strong>GENRE:</strong> ${SECRET_MOVIE.genre}<br>
                <strong>DIRECTOR:</strong> ${SECRET_MOVIE.director}<br>
                <strong>TMDB ID:</strong> ${SECRET_MOVIE.id}
            `;
        } else {
            infoBox.style.display = "none";
        }
    };
    overlay.appendChild(btnInfo);

    let btnChange = document.createElement("button");
    btnChange.innerText = "🎲 Force Swap Target Movie (Random Re-roll)";
    styleDevButton(btnChange, "#e53e3e");
    btnChange.onclick = async () => {
        if (dailyMoviePool.length === 0) return alert("Pool empty!");
        let randomIndex = Math.floor(Math.random() * dailyMoviePool.length);
        let selectedMovie = dailyMoviePool[randomIndex];
        
        btnChange.innerText = "🔄 Fetching New Core...";
        await loadTargetDetails(selectedMovie.id);
        
        infoBox.innerHTML = `
            <strong>TITLE:</strong> ${SECRET_MOVIE.title}<br>
            <strong>YEAR:</strong> ${SECRET_MOVIE.year}<br>
            <strong>GENRE:</strong> ${SECRET_MOVIE.genre}<br>
            <strong>DIRECTOR:</strong> ${SECRET_MOVIE.director}<br>
            <strong>TMDB ID:</strong> ${SECRET_MOVIE.id}
        `;
        btnChange.innerText = "🎲 Force Swap Target Movie (Random Re-roll)";
        showCustomGameModal("Target updated successfully!", `The new hidden answer is now locked into memory.`);
    };
    overlay.appendChild(btnChange);

    let btnClose = document.createElement("button");
    btnClose.innerText = "❌ Close Developer Suite";
    styleDevButton(btnClose, "#2d3748");
    btnClose.style.marginTop = "40px";
    btnClose.onclick = () => overlay.remove();
    overlay.appendChild(btnClose);

    document.body.appendChild(overlay);
}

function styleDevButton(btn, bgColor) {
    btn.style = `display:block; width:100%; max-width:400px; background:${bgColor}; color:#fff; border:none; padding:14px; margin:12px 0; font-size:15px; font-weight:bold; border-radius:6px; cursor:pointer; text-align:left;`;
}

// --- NEW CUSTOM NATIVE IN-GAME MODAL ELEMENT ---
function showCustomGameModal(titleText, bodyText) {
    if (document.getElementById("custom-game-modal-overlay")) return;

    let overlay = document.createElement("div");
    overlay.id = "custom-game-modal-overlay";
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; z-index:10000; padding:20px; box-sizing:border-box; font-family:sans-serif;";

    let card = document.createElement("div");
    card.style = "background:#1e1e24; color:#ffffff; padding:30px; border-radius:16px; width:100%; max-width:420px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.5); border:1px solid #333; transform: scale(0.9); animation: modalPop 0.25s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275);";

    let headline = document.createElement("h2");
    headline.innerText = titleText;
    headline.style = "margin:0 0 15px 0; font-size:22px; color:#4ade80; font-weight:bold;";
    card.appendChild(headline);

    let message = document.createElement("p");
    message.innerText = bodyText;
    message.style = "margin:0 0 25px 0; font-size:16px; color:#cbd5e1; line-height:1.5;";
    card.appendChild(message);

    let btn = document.createElement("button");
    btn.innerText = "OK";
    btn.style = "background:#4ade80; color:#0f172a; border:none; padding:12px 30px; font-size:16px; font-weight:bold; border-radius:8px; cursor:pointer; width:100%; transition: opacity 0.2s;";
    btn.onclick = () => overlay.remove();
    card.appendChild(btn);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Inject scaling animation into page dynamically
    if (!document.getElementById("modal-animation-style")) {
        let style = document.createElement("style");
        style.id = "modal-animation-style";
        style.innerHTML = "@keyframes modalPop { to { transform: scale(1); } }";
        document.head.appendChild(style);
    }
}

// 5. Fetch complete details for the user's selected movie guess
async function fetchAndSubmitGuess(movieId, saveToStorage = false) {
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

        if (saveToStorage) {
            saveGuessToStorage(movieId);
        }
    } catch (err) {
        console.error("Error processing guess selection:", err);
    }
}

// 6. Build Result Comparison Rows
function submitGuess(guessedMovie) {
    if (searchInput) searchInput.value = "";
    if (dropdown) dropdown.innerHTML = "";
    if (!feed) return;

    let row = document.createElement("div");
    row.classList.add("guess-row");

    let posterBlock = document.createElement("div");
    posterBlock.classList.add("poster-block");
    if (guessedMovie.poster) {
        posterBlock.style.backgroundImage = `url('${guessedMovie.poster}')`;
    }
    row.appendChild(posterBlock);

    row.appendChild(createInfoBlock(guessedMovie.title, guessedMovie.title === SECRET_MOVIE.title));

    let yearStatus = "absent";
    let displayYear = guessedMovie.year;
    if (guessedMovie.year === SECRET_MOVIE.year) {
        yearStatus = "correct";
    } else {
        displayYear += guessedMovie.year < SECRET_MOVIE.year ? " ⬆️" : " ⬇️";
    }
    row.appendChild(createInfoBlock(displayYear, yearStatus));

    row.appendChild(createInfoBlock(guessedMovie.genre, guessedMovie.genre === SECRET_MOVIE.genre));
    row.appendChild(createInfoBlock(guessedMovie.director, guessedMovie.director === SECRET_MOVIE.director));

    feed.insertBefore(row, feed.firstChild);

    // FIX: Replaced native alert window with native styling UI layout modal cards
    if (guessedMovie.title === SECRET_MOVIE.title) {
        setTimeout(() => {
            showCustomGameModal("🎉 Masterful Guessing!", "You found today's hidden movie! 🎬");
        }, 300);
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

// --- STORAGE CACHING LOOPS ---
function saveGuessToStorage(movieId) {
    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    let savedGuesses = JSON.parse(localStorage.getItem("moviedle_guesses")) || [];
    
    if (!savedGuesses.includes(movieId)) {
        savedGuesses.push(movieId);
        localStorage.setItem("moviedle_guesses", JSON.stringify(savedGuesses));
        localStorage.setItem("moviedle_date_seed", dateSeed.toString());
    }
}

async function loadSavedGuesses(currentDateSeed) {
    const storedDateSeed = localStorage.getItem("moviedle_date_seed");
    
    if (storedDateSeed !== currentDateSeed.toString()) {
        localStorage.removeItem("moviedle_guesses");
        localStorage.removeItem("moviedle_date_seed");
        return;
    }
    
    let savedGuesses = JSON.parse(localStorage.getItem("moviedle_guesses")) || [];
    for (const id of savedGuesses) {
        await fetchAndSubmitGuess(id, false);
    }
}

initGame();
