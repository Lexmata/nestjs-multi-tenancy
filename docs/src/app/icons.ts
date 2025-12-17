// Font Awesome icon library configuration
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faBook,
  faCheck,
  faChevronRight,
  faCircle,
  faCode,
  faCog,
  faCopy,
  faDatabase,
  faExternalLinkAlt,
  faFilter,
  faGlobe,
  faKey,
  faLock,
  faRocket,
  faSearch,
  faServer,
  faShield,
  faBolt,
  faCube,
  faLayerGroup,
  faWrench,
  faBoxOpen,
  faDna,
  faBullseye,
  faCodeBranch,
  faTerminal,
  faUsers,
  faPlug,
  faBars,
  faTimes,
  faHome,
  faFileCode,
  faProjectDiagram,
  faCloud,
  faSync,
} from '@fortawesome/free-solid-svg-icons';

import { faGithub, faNpm, faTwitter, faLinkedin } from '@fortawesome/free-brands-svg-icons';

/**
 * Initialize the Font Awesome icon library with commonly used icons.
 * Call this function in your app initialization.
 */
export function initializeIcons(library: FaIconLibrary): void {
  library.addIcons(
    // Navigation
    faArrowLeft,
    faArrowRight,
    faChevronRight,
    faBars,
    faTimes,
    faHome,
    faExternalLinkAlt,

    // Actions
    faCopy,
    faSearch,
    faCheck,
    faSync,

    // Features
    faLock,
    faShield,
    faBolt,
    faRocket,
    faCube,
    faLayerGroup,
    faWrench,
    faBoxOpen,
    faDna,
    faBullseye,
    faFilter,
    faPlug,

    // Tech
    faCode,
    faCodeBranch,
    faTerminal,
    faDatabase,
    faServer,
    faGlobe,
    faCloud,
    faFileCode,
    faProjectDiagram,

    // Content
    faBook,
    faCog,
    faKey,
    faCircle,
    faUsers,

    // Brands
    faGithub,
    faNpm,
    faTwitter,
    faLinkedin,
  );
}

// Re-export icons for direct use
export {
  faArrowLeft,
  faArrowRight,
  faBook,
  faCheck,
  faChevronRight,
  faCircle,
  faCode,
  faCog,
  faCopy,
  faDatabase,
  faExternalLinkAlt,
  faFilter,
  faGlobe,
  faKey,
  faLock,
  faRocket,
  faSearch,
  faServer,
  faShield,
  faBolt,
  faCube,
  faLayerGroup,
  faWrench,
  faBoxOpen,
  faDna,
  faBullseye,
  faCodeBranch,
  faTerminal,
  faUsers,
  faPlug,
  faBars,
  faTimes,
  faHome,
  faFileCode,
  faProjectDiagram,
  faCloud,
  faSync,
  faGithub,
  faNpm,
  faTwitter,
  faLinkedin,
};
