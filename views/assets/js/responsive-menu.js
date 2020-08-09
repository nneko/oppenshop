const menuSlide = () => {
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

menuSlide()