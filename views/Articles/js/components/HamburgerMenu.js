// HamburgerMenu.js
export default {
    name: 'HamburgerMenu',
    data() {
        return {
            isMenuOpen: false
        };
    },
    template: `
        <div class="pageHeader">
            <div class="pageHeader-left">
                <div 
                    class="hamburger-icon" 
                    id="hamburgerIcon"
                    @click="toggleMenu"
                    :class="{ 'active': isMenuOpen }"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            <div class="pageHeader-right">
                <input type="search" class="search-input" placeholder="Search...">
            </div>
        </div>
    `,
    methods: {
        toggleMenu() {
            this.isMenuOpen = !this.isMenuOpen;
            const navMenu = document.getElementById('nav-Menu');

            if (navMenu) {
                if (this.isMenuOpen) {
                    navMenu.classList.add('open');
                } else {
                    navMenu.classList.remove('open');
                }
            } else {
                console.warn("Could not find 'nav-Menu' element.");
            }
        },

        closeMenu() {
            this.isMenuOpen = false;
            const navMenu = document.getElementById('nav-Menu');

            if (navMenu) {
                navMenu.classList.remove('open');
            }
        },

        handleOutsideClick(event) {
            const navMenu = document.getElementById('nav-Menu');
            const hamburgerIcon = this.$el.querySelector('#hamburgerIcon');

            if (navMenu && hamburgerIcon) {
                if (!navMenu.contains(event.target) && !hamburgerIcon.contains(event.target)) {
                    this.closeMenu();
                }
            }
        }
    },

    mounted() {
        // Add outside click listener
        document.addEventListener('click', this.handleOutsideClick);
    },

    beforeUnmount() {
        // Clean up event listener
        document.removeEventListener('click', this.handleOutsideClick);
    }
};