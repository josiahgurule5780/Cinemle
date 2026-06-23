// script.js
const API_KEY = "a24cbba3b16a5ea825ec42ac4e4c8d52"; 
let SECRET_MOVIE = null;
let dailyMoviePool = []; 
let GAME_MODE = "daily"; 

// Use DOMContentLoaded to ensure elements exist before attaching listeners
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    setupSearchListeners();
});

async function initGame() {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&vote_count.gte=50&page=1`);
        const data = await res.json();
        dailyMoviePool = data.results || [];
        
        if (dailyMoviePool.length > 0) {
            await startMatch();
        }
    } catch (err) {
        console.error("Init Error:", err);
    }
}

function setupSearchListeners() {
    const searchInput = document.getElementById("movie-search");
    const dropdown = document.getElementById("dropdown-results");

    if (!searchInput) return;

    // Use 'input' instead of 'keyup' for better mobile support
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length > 1) {
            showDropdown(query);
        } else {
            dropdown.style.display = 'none';
        }
    });
}

function showDropdown(query) {
    const dropdown = document.getElementById("dropdown-results");
    dropdown.innerHTML = ""; // Clear old results
    
    const matches = dailyMoviePool.filter(m => m.title.toLowerCase().includes(query));
    
    matches.forEach(movie => {
        const div = document.createElement("div");
        div.innerText = movie.title;
        div.className = "dropdown-item";
        div.onclick = () => selectMovie(movie); // Ensure selection logic is bound here
        dropdown.appendChild(div);
    });
    
    dropdown.style.display = matches.length > 0 ? 'block' : 'none';
}

function selectMovie(movie) {
    console.log("Selected:", movie.title);
    document.getElementById("dropdown-results").style.display = 'none';
    document.getElementById("movie-search").value = movie.title;
    // Trigger your guess submission logic here
}

async function startMatch() {
    // Reset UI state
    document.getElementById("guesses-feed").innerHTML = "";
    // Logic to select movie based on mo
    de...
}
