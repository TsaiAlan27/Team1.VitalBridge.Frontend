import MenuItem from './MenuItem.js'



// 2. Define the main NavigationMenu component that uses MenuItem
export default {
    name: 'NavigationMenu',
    components: { MenuItem },
    template: `
        <nav class="nav-menu" id="navMenu">
            <ul>
                <menu-item v-for="item in menuItems" :key="item.name" :item="item"></menu-item>
            </ul>
        </nav>
    `,
    data() {
        return {
            menuItems: [] // Navigation menu data
        };
    },
    methods: {
        async fetchNavigationMenu() {
            try {
                const response = await fetch('/api/ContentArticleCategories');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error("Error fetching navigation menu:", error);
                return [];
            }
        },
        async loadNavigationMenu() {

            // Menu Data Structure with nested subcategories
            this.menuItems = [
                {
                    name: 'International',
                    link: '#international',
                    subcategories: [
                        { name: 'Asia', link: '#international-asia' },
                        { name: 'Europe', link: '#international-europe' },
                        { name: 'Americas', link: '#international-americas' }
                    ]
                },
                {
                    name: 'Sports',
                    link: '#sports',
                    subcategories: [
                        {
                            name: 'Football',
                            link: '#sports-football',
                            subcategories: [
                                { name: 'NFL', link: '#sports-football-nfl' },
                                { name: 'Premier League', link: '#sports-football-premierleague' },
                                { name: 'College Football', link: '#sports-football-college' }
                            ]
                        },
                        { name: 'Basketball', link: '#sports-basketball' },
                        { name: 'Cricket', link: '#sports-cricket' }
                    ]
                },
                {
                    name: 'Opinion',
                    link: '#opinion',
                    subcategories: []
                },
                {
                    name: 'Business',
                    link: '#business',
                    subcategories: [
                        { name: 'Finance', link: '#business-finance' },
                        { name: 'Startups', link: '#business-startups' },
                        { name: 'Marketing', link: '#business-marketing' }
                    ]
                },
                {
                    name: 'Youth',
                    link: '#youth',
                    subcategories: []
                },
                {
                    name: 'Entertainment',
                    link: '#entertainment',
                    subcategories: [
                        { name: 'Movies', link: '#entertainment-movies' },
                        { name: 'Music', link: '#entertainment-music' },
                        { name: 'Gaming', link: '#entertainment-gaming' }
                    ]
                },
                {
                    name: 'Lifestyle',
                    link: '#lifestyle',
                    subcategories: [
                        { name: 'Health & Wellness', link: '#lifestyle-health' },
                        { name: 'Travel Guides', link: '#lifestyle-travel' }
                    ]
                }
            ];
        }
    },
    mounted() {
        this.loadNavigationMenu();
    }
}
