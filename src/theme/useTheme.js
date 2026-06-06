import { useSelector } from 'react-redux';
import { getThemeSelector } from '../redux/selectors/common';


const commonColors = {
    TRANSPARENT: 'transparent',
    HEADER_COLOR: '#FFFFFF',
    HEADER_ICONS_COLOR: '#000000',
    ACTIVETINT_COLOR: '#540000',
    INACTIVETINT_COLOR: '#9A9A9A',
    TABBAR_BACKGROUND_COLOR: '#FFFFFF',
    TABBAR_TAB_BACKGROUND_COLOR: '#FFFFFF',
    BUTTON_COLOR: '#540000',
    BUTTON_COLOR_GRAY: '#E1E1E1',
    BUTTON_TEXT_COLOR_WHITE: '#FFFFFF',
    BACKGROUND_COLOR: '#F3F3F3',
    BORDER_COLOR: '#D8E0F0',
    BORDER_COLOR_BULE: '#4398B6',
    TEXT_COLOR_WHITE: '#FFFFFF',
    TEXT_COLOR_BLACK: '#111111',
    TEXT_COLOR_GREY: '#3A3F43',
    TEXT_COLOR_GREEN: 'green',
    LOADER_COLOR: '#540000',
    ICON_COLOR: '#111111',
    HEART_ICON_COLOR: '#540000',
    ICON_COLOR_WHITE: '#FFFFFF',
    PRICE_COLOR: '#540000',
    UNREAD_NOTIFICATION: '#FFFECB',
    APP_TEXT_SECONDARY: "#141B34",
    BORDER_COLOR_2: "#D8E0F0",
    PLACEHOLDER_TEXT: "#7D8592",
    SEARCH_ICON: "#A6A6A6",
    LINK_COLOR: "#6078EC",
    HEARED_COLOR: "#121111",
    IMG_BG_COLOR: "#D9D9D9",
    BLACK_WITH_80: "#292D32",
    BLACK_THIRD: "#5D6481"
};

const ThemeList = [
    { id: 0, color1: '#28a0dd', title: 'Default Theme', color2: '#FFE8ED', name: 'theme1' },
  ];
  

  

// Dynamically build theme colors
const useTheme = () => {
    const theme = useSelector(getThemeSelector);
    const selectedTheme = ThemeList.find(item => item.name === theme);

    if (selectedTheme) {
        return {
            Colors: {
                ...commonColors,
                APPTHEME: selectedTheme.color1,
                APPTHEMELIGHT: selectedTheme.color2,
                APPTHEME_TEXT_COLOR: selectedTheme.color1,
                HEADER_TEXT_COLOR: selectedTheme.color1,
                TEXT_COLOR_APPTHEME: selectedTheme.color1,
                ICON_COLOR_APPTHEME: selectedTheme.color1,
                LIGHT_APPTHEME: selectedTheme.color2,
                TEXT_COLOR_RED: selectedTheme.color2,
                ICON_COLOR_RED: selectedTheme.color2,
            }
        }
    }

    // Fallback to default theme if none matched
    return {
        Colors: {
            ...commonColors,
            APPTHEME: '#28a0dd',
            APPTHEMELIGHT: '#f76f71',
            APPTHEME_TEXT_COLOR: '#FF3B57',
            HEADER_TEXT_COLOR: '#FF3B57',
            TEXT_COLOR_APPTHEME: '#FF3B57',
            ICON_COLOR_APPTHEME: '#FF3B57',
            LIGHT_APPTHEME: '#f76f71',
            TEXT_COLOR_RED: '#f76f71',
            ICON_COLOR_RED: '#f76f71',
        }
    }
};

export default useTheme;
