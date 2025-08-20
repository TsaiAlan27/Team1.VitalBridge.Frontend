// 1. Define the recursive MenuItem component
export default {
    name: 'MenuItem',
    props: {
        item: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            isActive: false // Local state to manage submenu visibility
        };
    },
    template: `
        <li :class="{'has-submenu': item.subcategories && item.subcategories.length > 0, 'active': isActive}">
            <a :href="item.link" @click.prevent="toggleSubmenu">
                {{ item.name }}
                <span v-if="item.subcategories && item.subcategories.length > 0" class="arrow" :class="{ 'rotate': isActive }"></span>
            </a>
            <ul v-if="item.subcategories && item.subcategories.length > 0 && isActive">
                <menu-item v-for="subItem in item.subcategories" :key="subItem.name" :item="subItem"></menu-item>
            </ul>
        </li>
    `,
    methods: {
        toggleSubmenu() {
            if (this.item.subcategories && this.item.subcategories.length > 0) {
                this.isActive = !this.isActive;
            }
        }
    }
}