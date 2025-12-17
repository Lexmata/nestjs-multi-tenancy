// ========================================
// @lexmata/nestjs-multi-tenant Documentation
// Interactive functionality
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize syntax highlighting
  hljs.highlightAll();

  // Mobile menu toggle
  initMobileMenu();

  // Code tabs
  initCodeTabs();

  // Active navigation highlighting
  initActiveNavigation();

  // Smooth scroll for anchor links
  initSmoothScroll();
});

// ========================================
// Mobile Menu
// ========================================

function initMobileMenu() {
  const toggle = document.getElementById('mobileMenuToggle');
  const sidebar = document.getElementById('sidebar');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    sidebar.classList.toggle('open');
  });

  // Close menu when clicking a link
  sidebar.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      sidebar.classList.remove('open');
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
      toggle.classList.remove('active');
      sidebar.classList.remove('open');
    }
  });
}

// ========================================
// Code Tabs
// ========================================

function initCodeTabs() {
  const tabContainers = document.querySelectorAll('.code-tabs');

  tabContainers.forEach(container => {
    const buttons = container.querySelectorAll('.code-tab-btn');
    const codeBlocks = container.querySelectorAll('.code-block');

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab;

        // Update button states
        buttons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Show/hide code blocks
        codeBlocks.forEach(block => {
          if (block.dataset.tab === tab) {
            block.classList.remove('hidden');
          } else {
            block.classList.add('hidden');
          }
        });
      });
    });
  });
}

// ========================================
// Active Navigation
// ========================================

function initActiveNavigation() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  if (!sections.length || !navLinks.length) return;

  const observerOptions = {
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        updateActiveLink(id);
      }
    });
  }, observerOptions);

  sections.forEach(section => observer.observe(section));

  function updateActiveLink(id) {
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${id}`) {
        link.classList.add('active');
      }
    });
  }
}

// ========================================
// Smooth Scroll
// ========================================

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      // Update URL without jumping
      history.pushState(null, '', href);
    });
  });
}

// ========================================
// Copy to Clipboard (for code blocks)
// ========================================

function initCopyButtons() {
  document.querySelectorAll('.code-block').forEach(block => {
    const button = document.createElement('button');
    button.className = 'copy-btn';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;
    button.title = 'Copy to clipboard';

    button.addEventListener('click', async () => {
      const code = block.querySelector('code').textContent;

      try {
        await navigator.clipboard.writeText(code);
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        button.classList.add('copied');

        setTimeout(() => {
          button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
          button.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });

    block.style.position = 'relative';
    block.appendChild(button);
  });
}

// Initialize copy buttons after DOM is ready
document.addEventListener('DOMContentLoaded', initCopyButtons);

// ========================================
// Add styles for copy button
// ========================================

const copyButtonStyles = document.createElement('style');
copyButtonStyles.textContent = `
  .copy-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 4px;
    padding: 0.4rem;
    cursor: pointer;
    color: #a0a0b8;
    opacity: 0;
    transition: all 0.2s ease;
  }

  .code-block:hover .copy-btn {
    opacity: 1;
  }

  .copy-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #e8e8f0;
  }

  .copy-btn.copied {
    color: #4ade80;
  }

  .copy-btn svg {
    display: block;
  }
`;
document.head.appendChild(copyButtonStyles);

