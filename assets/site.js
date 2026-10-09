(function(){
  var h=document.querySelector('.site-header');
  var t=document.querySelector('.menu-toggle');
  if(t){t.addEventListener('click',function(){var o=h.classList.toggle('open');t.setAttribute('aria-expanded',o)});}
  var onScroll=function(){h&&h.classList.toggle('scrolled',window.scrollY>50)};
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  var y=document.getElementById('year');if(y)y.textContent=new Date().getFullYear();

  // lightbox
  var items=[].slice.call(document.querySelectorAll('[data-lightbox]'));
  if(items.length){
    var lb=document.createElement('div');lb.className='lightbox';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');
    lb.innerHTML='<button class="lb-close" aria-label="Close">&times;</button>'+(items.length>1?'<button class="lb-prev" aria-label="Previous">&#8249;</button><button class="lb-next" aria-label="Next">&#8250;</button>':'')+'<img alt=""><p></p>';
    document.body.appendChild(lb);
    var img=lb.querySelector('img'),cap=lb.querySelector('p'),i=0;
    function show(n){i=(n+items.length)%items.length;img.src=items[i].getAttribute('data-lightbox');img.alt=items[i].getAttribute('data-caption')||'';cap.textContent=items[i].getAttribute('data-caption')||'';lb.classList.add('open');document.body.style.overflow='hidden'}
    function close(){lb.classList.remove('open');document.body.style.overflow=''}
    items.forEach(function(el,n){el.addEventListener('click',function(e){e.preventDefault();show(n)})});
    lb.addEventListener('click',function(e){if(e.target===lb||e.target.classList.contains('lb-close'))close()});
    var p=lb.querySelector('.lb-prev'),nx=lb.querySelector('.lb-next');
    if(p)p.addEventListener('click',function(e){e.stopPropagation();show(i-1)});
    if(nx)nx.addEventListener('click',function(e){e.stopPropagation();show(i+1)});
    document.addEventListener('keydown',function(e){if(!lb.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='ArrowRight')show(i+1);if(e.key==='ArrowLeft')show(i-1)});
  }

  // contact form -> opens the visitor's email app (static site, no server)
  var f=document.querySelector('form.contact');
  if(f){f.addEventListener('submit',function(e){
    e.preventDefault();
    var g=function(n){return f.elements[n].value.trim()};
    var body=g('message')+'\n\n— '+g('name')+' ('+g('email')+')';
    window.location.href='mailto:frankie@benitez.studio?subject='+encodeURIComponent(g('subject'))+'&body='+encodeURIComponent(body);
  });}
})();
