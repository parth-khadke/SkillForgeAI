// =================================
// SCROLL TO TOP BUTTON
// =================================

const scrollTopBtn = document.getElementById('scrollTop');

window.addEventListener('scroll', () => {
  if (window.pageYOffset > 500) {
    scrollTopBtn.classList.add('visible');
  } else {
    scrollTopBtn.classList.remove('visible');
  }
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

// =================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// =================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    
    if (target) {
      const navHeight = document.querySelector('.nav-bar').offsetHeight;
      const targetPosition = target.offsetTop - navHeight;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// =================================
// INTERSECTION OBSERVER FOR ANIMATIONS
// =================================

const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe sections
document.querySelectorAll('section').forEach(section => {
  observer.observe(section);
});

// =================================
// FAQ ACCORDION (Preserve Default Behavior)
// =================================

// Details/summary works natively in HTML5
// No JS needed, but we can add custom behavior if desired

document.querySelectorAll('.faq-item').forEach(item => {
  item.addEventListener('toggle', () => {
    if (item.open) {
      // Close other open FAQs (optional - for accordion behavior)
      document.querySelectorAll('.faq-item').forEach(otherItem => {
        if (otherItem !== item && otherItem.open) {
          otherItem.open = false;
        }
      });
    }
  });
});

// =================================
// ACTIVE NAV LINK HIGHLIGHT (Optional)
// =================================

const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
  let current = '';
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    
    if (window.pageYOffset >= sectionTop - 200) {
      current = section.getAttribute('id');
    }
  });
  
  // You can add active class to nav links here if needed
});

// =================================
// PERFORMANCE: Debounce Scroll Events
// =================================

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Apply debounce to scroll events if needed
const debouncedScroll = debounce(() => {
  // Any expensive scroll operations here
}, 100);

window.addEventListener('scroll', debouncedScroll);

// =================================
// CONSOLE MESSAGE (Easter Egg)
// =================================

console.log(
  '%c⚒️ SkillForge AI',
  'font-size: 24px; font-weight: bold; color: #3b82f6;'
);
console.log(
  '%cBuilt with ❤️ to solve real learning problems',
  'font-size: 14px; color: #94a3b8;'
);
console.log(
  '%cInterested in the code? Check out our GitHub!',
  'font-size: 12px; color: #10b981;'
);