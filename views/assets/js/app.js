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
    })
}

app.init()