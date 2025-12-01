// Carga el contenido una vez que esta listo
document.addEventListener('DOMContentLoaded', () => {
    // clave y url de la API    
    const API_KEY = '3fa0bc41'; 
    const BASE_URL = `https://www.omdbapi.com/?apikey=${API_KEY}`;
    
    // Si no hay póster, usamos un placeholder.
    const DEFAULT_POSTER = 'https://img.freepik.com/vector-premium/no-hay-foto-disponible-icono-vectorial-simbolo-imagen-predeterminado-imagen-proximamente-sitio-web-o-aplicacion-movil_87543-10615.jpg';

    // variable globales
    let currentSearchTerm = '';
    let currentPage = 1; // Siempre empezamos en la página 1
    let totalResults = 0;
    let loadedMovieIds = []; // IDs para evitar duplicados en la paginación
    
    let isInfiniteScrollEnabled = false; 
    let isLoading = false; // Bandera para que no se hagan dos llamadas a la vez

    // referencias a los elementos del DOM
    const headerTitle = document.getElementById('header-title'); 
    const landingView = document.getElementById('landing-page');
    const resultsView = document.getElementById('results-view');
    const detailView = document.getElementById('detail-view');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const resultsList = document.getElementById('results-list');
    const resultsTitle = document.getElementById('results-title');
    const paginationContainer = document.getElementById('pagination-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const movieDetail = document.getElementById('movie-detail');
    const backToListBtn = document.getElementById('back-to-list-btn');
    const messageContainer = document.getElementById('message-container');

    // cambia las vistas
    function showView(viewToShow) {
        // Oculta todas las secciones
        [landingView, resultsView, detailView].forEach(view => {
            view.classList.add('hidden');
        });
        // Muestra solo la que queremos
        viewToShow.classList.remove('hidden');
        hideMessage();
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
        
        // Si no estamos en resultados, desactivamos el scroll infinito
        if (viewToShow.id !== 'results-view') {
            isInfiniteScrollEnabled = false;
        }
    }

    //muestra los mensajes
    function showMessage(message, isError = false) {
        messageContainer.textContent = message;
        messageContainer.classList.remove('hidden');
        messageContainer.classList.toggle('error-msg', isError);
        messageContainer.classList.toggle('info-msg', !isError);
    }

    // oculta los mensajes
    function hideMessage() {
        messageContainer.classList.add('hidden');
    }

    // busqueda de la Api
    async function searchMovies(term, page) {
        if (!term) return; 
        if (isLoading) return; 
        
        // Comprobamos si ya cargamos todas las películas
        if (resultsList.children.length >= totalResults && totalResults > 0) {
            isInfiniteScrollEnabled = false;
            paginationContainer.classList.add('hidden');
            return;
        }

        isLoading = true; 
        loadMoreBtn.disabled = true; 
        
        // Muestra el mensaje de carga según la página
        if (page === 1) {
            showMessage('Buscando películas, por favor espera...', false);
        } else {
            showMessage('Cargando más resultados...', false); 
        } 
        
        try {
            const url = `${BASE_URL}&s=${encodeURIComponent(term)}&page=${page}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                // Si hay un problema fon la API
                throw new Error(`Error de Api ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.Response === "True") {
                totalResults = parseInt(data.totalResults, 10);
                
                if (page === 1) {
                    // Si es la primera página, reiniciamos el estado
                    currentSearchTerm = term;
                    loadedMovieIds = []; 
                    resultsList.innerHTML = ''; 
                    resultsTitle.textContent = `Resultados de la búsqueda: "${term}"`;
                    showView(resultsView); 
                    isInfiniteScrollEnabled = false; 
                }
                
                renderResults(data.Search); // Dibujamos los resultados
                
                currentPage = page + 1; // Aumentar el número de página

                checkPagination(); // Revisa si hay que mostrar el botón
                hideMessage();

            } else {
                // Si la API dice que no hay resultados
                if (page === 1) {
                    resultsList.innerHTML = '';
                    resultsTitle.textContent = `Resultados de la búsqueda: "${term}"`;
                    showMessage(` No se encontraron resultados para "${term}".`, false);
                    showView(resultsView);
                } else {
                    showMessage('No hay más resultados para mostrar.', false);
                }
                isInfiniteScrollEnabled = false; 
                paginationContainer.classList.add('hidden');
            }

        } catch (error) {
            // Manejo de errores de conexión o clave API
            console.error('Error al obtener datos de la API:', error);
            const errorMessage = (error.message.includes('401') || error.message.includes('403')) 
                ? ' API Key inválida. Revisa tu clave OMDb.' 
                : ' Error de conexión o servidor. Inténtalo de nuevo.';
            showMessage(errorMessage, true);
        } finally {
            // Esto se ejecuta siempre al terminar la llamada
            isLoading = false; 
            loadMoreBtn.disabled = false; // Habilita el botón
        }
    }

    // DIBUJA LAS TARJETAS DE PELÍCULAS
    function renderResults(results) {
        const fragment = document.createDocumentFragment(); // Optimización de rendimiento

        results.forEach(movie => {
            // Evitamos duplicados, solo si el ID no está cargado
            if (loadedMovieIds.includes(movie.imdbID)) return;
            loadedMovieIds.push(movie.imdbID);

            const movieItem = document.createElement('div');
            movieItem.classList.add('movie-item');
            movieItem.dataset.imdbid = movie.imdbID;
            
            // Usamos el placeholder si la API devuelve 'N/A'
            const posterUrl = movie.Poster !== 'N/A' ? movie.Poster : DEFAULT_POSTER;
            
            movieItem.innerHTML = `
                <img src="${posterUrl}" alt="Póster de ${movie.Title}" 
                    onerror="this.onerror=null; this.src='${DEFAULT_POSTER}';" 
                    loading="lazy">
                <h4>${movie.Title}</h4>
                <p>(${movie.Year})</p>
            `;

            // detalle cuando clickas
            movieItem.addEventListener('click', () => {
                getMovieDetails(movie.imdbID);
            });

            fragment.appendChild(movieItem);
        });

        resultsList.appendChild(fragment);
    }

    // verifica el boton de ver mas
    function checkPagination() {
        const loadedCount = resultsList.children.length;
        
        // Mostramos el botón si faltan resultados y NO está activo el scroll infinito
        if (loadedCount < totalResults && !isInfiniteScrollEnabled) {
            paginationContainer.classList.remove('hidden');
        } else {
            paginationContainer.classList.add('hidden');
        }
    }

    // detalle de la pelicula
    async function getMovieDetails(imdbID) {
        showMessage('Cargando detalles...', false);
        movieDetail.innerHTML = ''; 

        try {
            const url = `${BASE_URL}&i=${imdbID}&plot=full`; // Búsqueda por ID con trama completa
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error de red: ${response.status}`);
            }

            const data = await response.json();

            if (data.Response === "True") {
                renderDetail(data);
                showView(detailView);
            } else {
                showMessage(`No se pudo cargar el detalle.`, true);
                showView(resultsView); 
            }

        } catch (error) {
            console.error('Error al obtener el detalle de la película:', error);
            showMessage('Ocurrió un error al cargar el detalle.', true);
            showView(resultsView); 
        }
    }

    // DIBUJA LA VISTA DE DETALLE
    function renderDetail(movieData) {
        const posterUrl = movieData.Poster !== 'N/A' ? movieData.Poster : DEFAULT_POSTER;

        movieDetail.innerHTML = `
            <div class="poster">
                <img src="${posterUrl}" alt="Póster de ${movieData.Title}" 
                    onerror="this.onerror=null; this.src='${DEFAULT_POSTER}';">
            </div>
            <div class="detail-info">
                <h2>${movieData.Title}</h2>
                <p><strong>Año:</strong> ${movieData.Year || 'N/A'}</p>
                <p><strong>Director:</strong> ${movieData.Director || 'N/A'}</p>
                <p><strong>Actores:</strong> ${movieData.Actors || 'N/A'}</p>
                <p><strong>Sinopsis:</strong> ${movieData.Plot || 'Sinopsis no disponible.'}</p>
                <p><strong>Género:</strong> ${movieData.Genre || 'N/A'}</p>
                <p><strong>Rating IMDB:</strong> ${movieData.imdbRating || 'N/A'}</p>
            </div>
        `;
    }

    // FUNCIÓN PARA EL SCROLL INFINITO
    function handleScroll() {
        // Solo funciona si el scroll infinito está activado y no hay carga en curso
        if (!isInfiniteScrollEnabled || isLoading) return;

        // Calcula si estamos cerca del final de la página (500px antes de terminar)
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollTop = document.documentElement.scrollTop;
        const clientHeight = document.documentElement.clientHeight;
        
        if (scrollTop + clientHeight >= scrollHeight - 500) {
            // Llama a searchMovies con la página siguiente
            searchMovies(currentSearchTerm, currentPage);
        }
    }

   
    // los eventos

    // inicio 
    headerTitle.addEventListener('click', () => {
        initApp();
    });

    // buscador
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Evita que la página se recargue
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            currentPage = 1; // Reinicia la paginación para la nueva búsqueda
            isInfiniteScrollEnabled = false; 
            searchMovies(searchTerm, 1);
        } else {
            showMessage('Por favor, introduce un término de búsqueda.', false);
        }
    });

    // ver mas
    loadMoreBtn.addEventListener('click', () => {
        isInfiniteScrollEnabled = true; // A partir de aquí, el scroll se hace cargo
        paginationContainer.classList.add('hidden');
        searchMovies(currentSearchTerm, currentPage);
    });

    // volver
    backToListBtn.addEventListener('click', () => {
        showView(resultsView);
    });

    // scroll infinito
    window.addEventListener('scroll', handleScroll);


    // iniciacion de la aplicacion

    function initApp() {
        // Reinicia todas las variables a su estado original
        currentSearchTerm = '';
        currentPage = 1;
        totalResults = 0;
        loadedMovieIds = [];
        isInfiniteScrollEnabled = false;
        isLoading = false;
        
        // Prepara la interfaz
        searchInput.value = ''; 
        searchInput.focus(); 
        
        showView(resultsView); // Empieza en la vista de resultados vacía
        resultsList.innerHTML = ''; 
        paginationContainer.classList.add('hidden');
    }
    
    // inicia la aplicacion
    initApp();
});
