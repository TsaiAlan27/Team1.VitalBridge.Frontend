
import NavigationMenu from "./components/NavigationMenu.js"
import MenuItem from './components/MenuItem.js' // Also import MenuItem as NavigationMenu depends on it

// Clean Vue script template
const vueApp = {
    components: {
        // Register components here
        'navigation-menu': NavigationMenu,
        'menu-item': MenuItem // Register MenuItem as well, since it's a nested component
    },
    data() {
        return {
            // Define reactive state here
            // Menu
        };
    },
    methods: {
        // Define your functions here
    },
    mounted() {
        // This lifecycle hook runs after the component has been mounted to the DOM.
        // It's a good place to add event listeners to global elements or perform direct DOM manipulations.

        // Hamburger Menu Toggle
        const hamburgerIcon = document.getElementById('hamburgerIcon');
        const navMenu = document.getElementById('navMenu');

        // Check if the elements exist before adding listeners to prevent errors
        if (hamburgerIcon && navMenu) {
            // Add a click listener to the hamburger icon to toggle the 'open' class on the navigation menu
            hamburgerIcon.addEventListener('click', function () {
                navMenu.classList.toggle('open');
            });
        } else {
            console.warn("Could not find 'hamburgerIcon' or 'navMenu' elements. Ensure they exist in your HTML with these IDs.");
        }

        // Close nav menu when clicking outside (optional, but good UX)
        // We need to store a reference to the function to correctly remove it later
        const self = this; // Capture the 'this' context of the Vue component if needed inside the listener, though not strictly necessary here.
        const outsideClickListener = function (event) {
            const currentNavMenu = document.getElementById('navMenu');
            const currentHamburgerIcon = document.getElementById('hamburgerIcon');

            // Only proceed if both elements are still in the DOM
            if (currentNavMenu && currentHamburgerIcon) {
                // If the clicked target is neither inside the nav menu nor inside the hamburger icon
                if (!currentNavMenu.contains(event.target) && !currentHamburgerIcon.contains(event.target)) {
                    currentNavMenu.classList.remove('open'); // Remove the 'open' class
                }
            }
        };

        // Add the global click event listener
        document.addEventListener('click', outsideClickListener);

        // Store the function reference on the component instance so it can be removed in beforeUnmount
        this._outsideClickListener = outsideClickListener;
    },
    beforeUnmount() {
        // This lifecycle hook runs just before the component is unmounted from the DOM.
        // It's crucial to remove any manually added event listeners to prevent memory leaks.

        // Remove the global click event listener that was added in 'mounted'
        if (this._outsideClickListener) {
            document.removeEventListener('click', this._outsideClickListener);
        }
    }
};

// Create and mount the Vue app
const app = Vue.createApp(vueApp);
app.mount('#app');

