function showLogos() {
  const svg = document.getElementById("logospace");
  const ns = svg.namespaceURI;
  const width = window.innerWidth - 20;
  const height = window.innerHeight - 20;
  const centerWidth = 700;
  const centerHeight = 300;
  const samuraiWidth = 600;
  const samuraiHeight = 150;
  const ipsjWidth = 400;
  const ipsjHeight = 150;

  const logoWidth = 140;
  const logoHeight = 60;
  var logoX = 0;
  var logoY = 0;
  var logos = [];

  sessionStorage.matchesFinished = 0;

  window.addEventListener(
    'resize', function (evt) { location.reload(); });

  svg.setAttribute('width', width);
  svg.setAttribute('height', height);

  function addLogo(src, w, h) {
    const image = document.createElementNS(ns, "image");
    image.setAttribute('href', src);
    image.setAttribute('width', w || logoWidth);
    image.setAttribute('height', h || logoHeight);
    logos.push(image);
  }

  addLogo("logos/e-Seikatsu.png", 330, 150);
  addLogo("logos/jprs.png", 120, 60);
  addLogo("logos/hitachi.png", 280, 150);
  addLogo("logos/KCT.png", 150);
  addLogo("logos/nomura.png", 400, 80);
  addLogo("logos/fujitsu.png", 200, 80);

  const samurai = document.createElementNS(ns, "image");
  samurai.setAttribute('href', "logos/samurailogo.png");
  samurai.setAttribute('width', samuraiWidth);
  samurai.setAttribute('height', samuraiHeight);
  samurai.setAttribute('x', width/2 - samuraiWidth/2);
  samurai.setAttribute('y', height/2 - centerHeight/2 - samuraiHeight + 80);
  svg.appendChild(samurai);

  const center = document.createElementNS(ns, "image");
  center.setAttribute('href', "logos/seizoroi.png");
  center.setAttribute('width', centerWidth);
  center.setAttribute('height', centerHeight);
  center.setAttribute('x', width/2 - centerWidth/2);
  center.setAttribute('y', height/2 - centerHeight/2);
  svg.appendChild(center);

  const ipsj = document.createElementNS(ns, "image");
  ipsj.setAttribute('href', "logos/IPSJ-logo.jpg");
  ipsj.setAttribute('width', ipsjWidth);
  ipsj.setAttribute('height', ipsjHeight);
  ipsj.setAttribute('x', width/2 - ipsjWidth/2);
  ipsj.setAttribute('y', height/2 + centerHeight/2 - 100);
  svg.appendChild(ipsj);

  function placeLogos(rotation) {
    for (var k = 0; k != logos.length; k++) {
      const angle = 2*k*Math.PI/logos.length + rotation;
      const w = logos[k].getAttribute('width');
      const h = logos[k].getAttribute('height');
      const x = (width-w)/2 * (1+Math.cos(angle));
      const y = ((height-100-h)/2) * (1+Math.sin(angle))+50;
      logos[k].setAttribute('x', x);
      logos[k].setAttribute('y', y);
    }
  }

  placeLogos(0);
  for (var k = 0; k != logos.length; k++) {
    svg.appendChild(logos[k]);
  }

  var rotation = 0;
  const delta = Math.PI/500;
  window.setInterval(
    function () {
      placeLogos(rotation);
      rotation += delta;
    },
    50);

  function button(x, y, w, h, rx, ry, background, whenOver, label, href) {
    var buttonRect = document.createElementNS(ns, "rect");
    buttonRect.setAttribute('x', x-w/2);
    buttonRect.setAttribute('y', y-h/2);
    buttonRect.setAttribute('width', w);
    buttonRect.setAttribute('height', h);
    buttonRect.setAttribute('rx', rx);
    buttonRect.setAttribute('ry', ry);
    buttonRect.setAttribute('fill', background);

    var buttonLabel = document.createElementNS(ns, "text");
    buttonLabel.setAttribute('font-size', 28);
    buttonLabel.innerHTML = label;
    buttonLabel.setAttribute('x', x);
    buttonLabel.setAttribute('y', y);
    buttonLabel.setAttribute('width', w);
    buttonLabel.setAttribute('height', h);
    buttonLabel.setAttribute('text-anchor', 'middle');
    buttonLabel.setAttribute('dominant-baseline', 'middle');
    buttonLabel.setAttribute('fill', 'white');
    var button = document.createElementNS(ns, "g");
    button.appendChild(buttonRect);
    button.appendChild(buttonLabel);
    button.addEventListener('click',
			    function() { location.href = href; });
    button.addEventListener('mouseover',
			    function() { buttonRect.setAttribute('fill', whenOver); });
    button.addEventListener('mouseout',
			    function() { buttonRect.setAttribute('fill', background); });
    button.style.cursor = "pointer";
    svg.appendChild(button);
  }

  button(width/2 - 130, height/2 + centerHeight/2 + 60,
	 100, 32, 5, 5, '#080', '#800',
	 "Intro", "ruleSummary/summary.html");
  button(width/2, height/2 + centerHeight/2 + 60,
	 150, 32, 5, 5, '#080', '#800',
	 "Preliminary", "preliminary.html");
  button(width/2 + 130, height/2 + centerHeight/2 + 60,
	 100, 32, 5, 5, '#080', '#800',
	 "Games", "tournament.html");
}
