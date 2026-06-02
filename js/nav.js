const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.7);
window.addEventListener('scroll', onScroll, {passive:true});
onScroll();
