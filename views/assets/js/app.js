const app = {}
/*
let service = {};

service.query = function (httpMethod, protocol, apigw, port, endpoint, query, data, callback, headers) {
    let xhr = new XMLHttpRequest();

    let proto = typeof (protocol) == 'string' ? protocol : 'http';
    let hostname = typeof (apigw) == 'string' ? apigw : location.hostname;
    let prt = typeof (port) == 'string' ? port : location.port;

    let queryURL = protocol + '://' + hostname + ':' + port + '/' + endpoint + '?' + query;

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            callback(xhr.status, xhr.response);
        }
    }
    xhr.open(httpMethod, queryURL);
    xhr.setRequestHeader("Content-Type", "application/json;charset=utf-8");

    //Set optional response HTTP headers and or override the defaults
    if (((headers && headers !== 'null' && headers !== 'undefined') ? true : false) && headers != {}) {
        for (const [k, v] of Object.entries(headers)) {
            xhr.setRequestHeader(k, v);
        }
    }

    xhr.send(JSON.stringify(data));
};
*/
app.setupMenu = () => {
    const menuButton = document.querySelector('.menu-button')
    const navLinks = document.querySelector('.nav-links')
    const menuLinks = document.querySelectorAll('.nav-links li ')

    menuButton.addEventListener('click', () => {

        //Menu Slide
        navLinks.classList.toggle('nav-show-links')

        //Fade menu links into view
        /*
        menuLinks.forEach((link, index) => {
            if (link.style.animation) {
                link.style.animation = ''
            } else {
                link.style.animation = `navLinkFade 0.5s ease forwards ${index/8 + 0.5}s`
            }
        })*/

        //Menu Button Animation
        menuButton.classList.toggle('toggle')
    })
}

app.setupResponsiveSearchForm = () => {
    const activateSearchButton = document.querySelector('.activate-search-button')
    const searchForm = document.querySelector('.responsive-search-form')
    const searchInput = document.querySelector('.responsive-search-input')
    const navigation = document.querySelector('.menu-main')
    const closeButton = document.querySelector('.search-button-prepend')

    if(activateSearchButton) activateSearchButton.addEventListener('click', () => {
        if (searchForm && navigation) {
            navigation.classList.toggle('hide-menu-main')
            searchForm.classList.toggle('expand-search-form')
            searchForm.classList.toggle('expand-search-input')  
        }
    })

    if (closeButton) closeButton.addEventListener('click', () => {
        if (searchForm && navigation) {
            navigation.classList.toggle('hide-menu-main')
            searchForm.classList.toggle('expand-search-form')
            searchForm.classList.toggle('expand-search-input')  
        }
    })
}

app.setupSearchControl = () => {
    let closeSearchButton = document.querySelector('.hide-search-results-button')
    let resultsContainer = document.querySelector('.returned-results-section')
    let searchSection = document.querySelector('.search-results')
    let searchInfoAlert = document.getElementById('main-alert-info')
    let searchSuccessAlert = document.getElementById('main-alert-success')

    if(closeSearchButton) closeSearchButton.addEventListener('click', () => {
        if(resultsContainer) {
            resultsContainer.innerHTML = ''
        }

        if(searchSection) {
            searchSection.classList.add('hide-search-results')
            searchSection.classList.add('fade')
        }

        if(searchInfoAlert){
            searchInfoAlert.classList.remove('show')
            searchInfoAlert.remove()
        }

        if (searchSuccessAlert) {
            searchSuccessAlert.classList.remove('show')
            searchSuccessAlert.remove()
        }
    })
}

app.search = async (query) => {
    let xhr = new XMLHttpRequest()

    let searchQuery = {
        query: {
            match: {
                name: {
                    query: query
                }
            }
        }
    }

    let searchURL = '/find'
}

app.init = () => {
    window.addEventListener('load', () => {
        app.setupMenu()
        app.setupResponsiveSearchForm()
        app.setupSearchControl()

        $(function () {
            $('[data-toggle="tooltip"]').tooltip()
        })
    })
}

app.init()