let allCountries = []; // Store all countries
let debounceTimer; // For debouncing input

// Fetch all countries on load
async function loadCountries() {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '<p class="loading">Loading countries...</p>';
  resultDiv.style.display = 'block';
  try {
    const response = await fetch('https://restcountries.com/v3.1/all');
    if (!response.ok) throw new Error('Failed to load countries');
    allCountries = await response.json();
    resultDiv.style.display = 'none'; // Hide loading once done
  } catch (error) {
    console.error('Error loading countries:', error);
    resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
  }
}

// Debounce function to limit API calls
function debounce(func, delay) {
  return function (...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(this, args), delay);
  };
}

// Fuzzy matching function
function fuzzyMatch(input, countryName) {
  const inputLower = input.toLowerCase();
  const nameLower = countryName.toLowerCase();
  return nameLower.includes(inputLower) || nameLower.split(' ').some(word => word.startsWith(inputLower));
}

// Expanded flag color mapping
function getFlagColor(countryName) {
  const colorMap = {
    'Japan': '#BC002D',       // Red
    'Brazil': '#009B3A',      // Green
    'France': '#0055A4',      // Blue
    'Australia': '#FFDE00',   // Yellow
    'Canada': '#FF0000',      // Red
    'Germany': '#FFCE00',     // Yellow
    'India': '#FF9933',       // Orange
    'Italy': '#009246',       // Green
    'Mexico': '#006847',      // Green
    'South Africa': '#007A4D',// Green
    'United Kingdom': '#00247D', // Blue
    'United States': '#B22234' // Red
  };
  return colorMap[countryName] || '#4a5568'; // Default dark gray to match dark mode
}

// Display country data with robust flag handling
function displayCountry(country, resultDiv) {
  let flagUrl = country.flags.png || country.flags.svg || 'https://via.placeholder.com/150?text=No+Flag';
  resultDiv.innerHTML = `
    <h2>${country.name.common}</h2>
    <img src="${flagUrl}" alt="${country.name.common} flag" class="flag" 
         onerror="this.src='https://via.placeholder.com/150?text=No+Flag'; this.alt='Flag not available'">
    <p><strong>Capital:</strong> ${country.capital ? country.capital[0] : 'N/A'}</p>
    <p><strong>Population:</strong> ${country.population.toLocaleString()}</p>
    <p><strong>Currency:</strong> ${Object.values(country.currencies)[0].name} (${Object.values(country.currencies)[0].symbol})</p>
    <p><strong>Languages:</strong> ${Object.values(country.languages).join(', ')}</p>
    <p><strong>Region:</strong> ${country.region}</p>
  `;
  resultDiv.style.borderColor = getFlagColor(country.name.common);
  resultDiv.style.display = 'block';
}

// Search function
async function searchCountry(input, resultDiv) {
  if (!input) {
    resultDiv.innerHTML = '<p class="error">Please enter a country name!</p>';
    resultDiv.style.display = 'block';
    return;
  }
  resultDiv.innerHTML = '<p class="loading">Loading...</p>';
  resultDiv.style.display = 'block';
  try {
    const response = await fetch(`https://restcountries.com/v3.1/name/${input}`);
    if (!response.ok) throw new Error('Country not found');
    const data = await response.json();
    displayCountry(data[0], resultDiv);
  } catch (error) {
    resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    resultDiv.style.display = 'block';
  }
}

// Enhanced autocomplete with animation, accessibility, and fuzzy matching
function showSuggestions(input, suggestionsList, regionFilter) {
  suggestionsList.innerHTML = '';
  if (!input) {
    suggestionsList.style.display = 'none';
    return;
  }

  let filteredCountries = allCountries;
  if (regionFilter !== 'all') {
    filteredCountries = allCountries.filter(country => country.region === regionFilter);
  }

  const matches = filteredCountries
    .filter(country => fuzzyMatch(input, country.name.common))
    .slice(0, 5); // Limit to 5 suggestions

  if (matches.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No results found';
    li.classList.add('no-results');
    li.style.cursor = 'default';
    suggestionsList.appendChild(li);
  } else {
    matches.forEach(country => {
      const li = document.createElement('li');
      li.textContent = country.name.common;
      li.setAttribute('role', 'option'); // ARIA for accessibility
      li.setAttribute('aria-selected', 'false');
      li.addEventListener('click', () => {
        document.getElementById('country-input').value = country.name.common;
        suggestionsList.style.display = 'none';
        searchCountry(country.name.common, document.getElementById('result'));
      });
      li.addEventListener('mouseover', () => {
        li.style.backgroundColor = '#4a5568'; // Darker gray on hover
        li.style.transform = 'translateX(5px)';
      });
      li.addEventListener('mouseout', () => {
        li.style.backgroundColor = '';
        li.style.transform = '';
      });
      suggestionsList.appendChild(li);
    });
  }

  suggestionsList.style.display = 'block';
  // Add animation class for slide-down effect
  suggestionsList.classList.add('animate-slide-down');
  setTimeout(() => suggestionsList.classList.remove('animate-slide-down'), 300);
}

// Event listeners
window.addEventListener('load', loadCountries);

document.getElementById('search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('country-input').value.trim();
  searchCountry(input, document.getElementById('result'));
  document.getElementById('suggestions').style.display = 'none';
});

// Debounced input handler for autocomplete
document.getElementById('country-input').addEventListener('input', debounce((e) => {
  const regionFilter = document.getElementById('region-filter').value;
  showSuggestions(e.target.value.trim(), document.getElementById('suggestions'), regionFilter);
}, 300)); // 300ms debounce to optimize performance

document.getElementById('country-input').addEventListener('keydown', (e) => {
  const suggestionsList = document.getElementById('suggestions');
  const items = suggestionsList.querySelectorAll('li:not(.no-results)');
  let activeIndex = -1;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (activeIndex < items.length - 1) {
      activeIndex = activeIndex === -1 ? 0 : activeIndex + 1;
      items.forEach((item, index) => {
        item.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
        item.style.backgroundColor = index === activeIndex ? '#4a5568' : '';
        item.style.transform = index === activeIndex ? 'translateX(5px)' : '';
      });
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (activeIndex > 0) {
      activeIndex--;
    } else if (activeIndex === 0) {
      activeIndex = -1;
    }
    items.forEach((item, index) => {
      item.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
      item.style.backgroundColor = index === activeIndex ? '#4a5568' : '';
      item.style.transform = index === activeIndex ? 'translateX(5px)' : '';
    });
    if (activeIndex >= 0) {
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  } else if (e.key === 'Enter' && activeIndex >= 0) {
    e.preventDefault();
    const selectedCountry = items[activeIndex].textContent;
    document.getElementById('country-input').value = selectedCountry;
    suggestionsList.style.display = 'none';
    searchCountry(selectedCountry, document.getElementById('result'));
  }
});

document.getElementById('region-filter').addEventListener('change', (e) => {
  const input = document.getElementById('country-input').value.trim();
  showSuggestions(input, document.getElementById('suggestions'), e.target.value);
});

document.getElementById('random-btn').addEventListener('click', async () => {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '<p class="loading">Loading...</p>';
  resultDiv.style.display = 'block';
  const regionFilter = document.getElementById('region-filter').value;
  let filteredCountries = allCountries;
  if (regionFilter !== 'all') {
    filteredCountries = allCountries.filter(country => country.region === regionFilter);
  }
  const randomCountry = filteredCountries[Math.floor(Math.random() * filteredCountries.length)];
  if (randomCountry) {
    displayCountry(randomCountry, resultDiv);
  } else {
    resultDiv.innerHTML = '<p class="error">Error: No countries available</p>';
    resultDiv.style.display = 'block';
  }
});