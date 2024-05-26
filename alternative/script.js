document.addEventListener('DOMContentLoaded', function() {

    d3.csv('data/digimons.csv').then(function(data) {
        const digimonList = document.getElementById('digimon-list');
        const overlay = document.getElementById('overlay');
        const digimonDetails = document.getElementById('digimon-details');
        const container = document.querySelector('.container');
        const searchBar = document.getElementById('search-input');
        let lastScrollPosition = 0;

        // Mapeamento de evoluções e variações
        const evolveMap = {};
        const variationMap = {};

        // Preencher evolveMap
        data.forEach(digimon => {
            if (digimon['Evolve To']) {
                const evolveTos = digimon['Evolve To'].split(',').map(name => name.trim());
                evolveTos.forEach(evolveTo => {
                    const match = evolveTo.match(/^([^\[]+)(?:\s*\[(.+)\])?$/);
                    const evolveToName = match ? match[1].trim() : evolveTo;
                    const additionalInfo = match && match[2] ? match[2].trim() : '';
                    if (!evolveMap[evolveToName]) {
                        evolveMap[evolveToName] = [];
                    }
                    evolveMap[evolveToName].push({ name: digimon.Name, info: additionalInfo });
                });
            }
        });

        // Preencher variationMap
        data.forEach(digimon => {
            if (digimon['Alternative']) {
                const variations = digimon['Alternative'].split(',').map(name => name.trim());
                variations.forEach(variation => {
                    const match = variation.match(/^([^\[]+)(?:\s*\[(.+)\])?$/);
                    const variationName = match ? match[1].trim() : variation;
                    const additionalInfo = match && match[2] ? match[2].trim() : '';
                    if (!variationMap[variationName]) {
                        variationMap[variationName] = [];
                    }
                    variationMap[variationName].push({ name: digimon.Name, info: additionalInfo });
                });
            }
        });

        // Atualizar cada Digimon com seu "Evolve From" e variações bidirecionais
        data.forEach(digimon => {
            // Processar evoluções
            const evolveFromNames = evolveMap[digimon.Name] ? evolveMap[digimon.Name].map(d => d.name) : [];
            const manualEvolveFrom = digimon['Evolve From'] ? digimon['Evolve From'].split(',').map(name => name.trim()) : [];
            const combinedEvolveFrom = [...manualEvolveFrom, ...evolveFromNames.filter(name => !manualEvolveFrom.includes(name))];

            const evolveFrom = combinedEvolveFrom
                .map(name => {
                    if (manualEvolveFrom.some(manualName => manualName.split('[')[0].trim() === name)) {
                        return manualEvolveFrom.find(manualName => manualName.split('[')[0].trim() === name);
                    }
                    const additionalInfo = evolveMap[digimon.Name] && evolveMap[digimon.Name].find(d => d.name === name) ? evolveMap[digimon.Name].find(d => d.name === name).info : '';
                    return `${name}${additionalInfo ? ` [${additionalInfo}]` : ''}`;
                })
                .join(', ');

            digimon['Evolve From'] = evolveFrom;

            // Processar variações
            const variationNames = variationMap[digimon.Name] ? variationMap[digimon.Name].map(d => d.name) : [];
            const manualVariations = digimon['Alternative'] ? digimon['Alternative'].split(',').map(name => name.trim()) : [];
            const combinedVariations = [...manualVariations, ...variationNames.filter(name => !manualVariations.some(manualName => manualName.split('[')[0].trim() === name))];

            const digimonVariations = combinedVariations
                .map(name => {
                    if (manualVariations.some(manualName => manualName.split('[')[0].trim() === name)) {
                        return manualVariations.find(manualName => manualName.split('[')[0].trim() === name);
                    }
                    const additionalInfo = variationMap[digimon.Name] && variationMap[digimon.Name].find(d => d.name === name) ? variationMap[digimon.Name].find(d => d.name === name).info : '';
                    return `${name}${additionalInfo ? ` [${additionalInfo}]` : ''}`;
                })
                .join(', ');

            digimon['Alternative'] = digimonVariations;
        });

        // Função para exibir a lista de Digimons
        function displayDigimons(digimons) {
            digimonList.innerHTML = '';
            const stages = {};

            digimons.forEach(digimon => {
                if (digimon.Hide && digimon.Hide.toLowerCase() === 'true') {
                    return;
                }

                if (!stages[digimon.Stage]) {
                    stages[digimon.Stage] = [];
                }
                stages[digimon.Stage].push(digimon);
            });

            for (const stage in stages) {
                if (stages.hasOwnProperty(stage)) {
                    const stageSection = document.createElement('div');
                    stageSection.className = 'stage-section';

                    const stageHeader = document.createElement('h2');
                    stageHeader.textContent = stage;
                    stageSection.appendChild(stageHeader);

                    // Ordenar por categoria dentro de cada estágio
                    const sortedDigimons = stages[stage].sort((a, b) => {
                        if (a.Category === 'Alt Version' && b.Category !== 'Alt Version') {
                            return -1; // "alt version" vem primeiro
                        }
                        if (a.Category !== 'Alt Version' && b.Category === 'Alt Version') {
                            return 1; // "alt version" vem primeiro
                        }
                        if (a.Category === b.Category) {
                            return a.Name.localeCompare(b.Name); // Ordenar por nome dentro da mesma categoria
                        }
                        return a.Category.localeCompare(b.Category); // Ordenar por categoria
                    });
                    
                    const cardsContainer = document.createElement('div');
                    cardsContainer.className = 'digimon-cards-container';
                    stageSection.appendChild(cardsContainer);

                    sortedDigimons.forEach(digimon => {
                        const card = document.createElement('div');
                        card.className = `digimon-card ${digimon.Stage.toLowerCase()} `;
                        card.innerHTML = `
                            <img src="images/${digimon.Name}.png" alt="${digimon.Name}">
                            <h3>${digimon.Name}</h3>
                            ${digimon.Category !== 'Alt Version' ? `<div class=" category-tag ${digimon.Category.toLowerCase().replace(/\s+/g, '-')}">${digimon.Category}</div>` : ''}

                        `;
                        card.addEventListener('click', () => showDetails(digimon));
                        cardsContainer.appendChild(card);
                    });

                    digimonList.appendChild(stageSection);
                }
            }
        }

        // Função para filtrar os Digimons
        function filterDigimons(query) {
            const filtered = data.filter(digimon => {
                if (digimon.Hide && digimon.Hide.toLowerCase() === 'true') {
                    return false;
                }

                return Object.values(digimon).some(value => 
                    value.toLowerCase().includes(query.toLowerCase())
                );
            });
            displayDigimons(filtered);
        }

        // Evento de input na barra de pesquisa
        searchBar.addEventListener('input', function() {
            const query = searchBar.value;
            filterDigimons(query);
        });

        displayDigimons(data);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDetails();
            }
        });

        function showDetails(digimon) {
            if (overlay.classList.contains('hidden')) {
                lastScrollPosition = window.scrollY;  // Save the current scroll position
                document.body.style.position = 'fixed';
                document.body.style.top = `-${lastScrollPosition}px`;
            }
        
            if (!overlay.classList.contains('hidden')) {
                container.classList.add('closing');
                overlay.classList.add('closing');
        
                container.addEventListener('animationend', function() {
                    overlay.classList.remove('closing');
                    container.classList.remove('closing');
                    displayDetails(digimon);
                }, { once: true });
            } else {
                displayDetails(digimon);
                updateMetaTags(digimon);  // Atualiza as metatags

            }
        }

        const authorProfiles = {
            'Aderek': 'https://x.com/AderekArt',
            'Emiluna': 'https://twitter.com/Ochistrikitu',
            'Thais Inoue': 'https://x.com/Thaino_Noronha',
            'BarillRojas': 'https://x.com/BarillRojas',
            'Jonatas Carmona': 'https://x.com/JonatasCarmona',
            'Shewdon Barcelos': 'https://x.com/ShewdonBarcelos',
        };
        function updateMetaTags(digimon) {
            const metaTitle = document.querySelector('meta[property="og:title"]');
            const metaImage = document.querySelector('meta[property="og:image"]');
            const metaDescription = document.querySelector('meta[property="og:description"]');
        
            if (metaTitle) metaTitle.setAttribute('content', `Digital Monster: ${digimon.Name}`);
            if (metaImage) metaImage.setAttribute('content', `images/${digimon.Name}.png`);
            if (metaDescription) metaDescription.setAttribute('content', digimon.Description);
        }
        
        function displayDetails(digimon) {
            overlay.classList.remove('hidden');
            container.classList.remove('hidden');
            digimonDetails.className = '';
            digimonDetails.classList.add(digimon.Stage.toLowerCase());
        
            window.location.hash = digimon.Name.replace(/ /g, '_');
        
            const evolveFromHTML = parseEvolution(digimon['Evolve From']);
            const evolveToHTML = parseEvolution(digimon['Evolve To']);
            const variationsHTML = parseVariations(digimon['Alternative']);
            const galleryHTML = parseGallery(digimon['Gallery']);
        
            let authorsHTML = '';
            if (digimon.Author) {
                const authors = digimon.Author.split(',').map(author => author.trim());
                authorsHTML = authors.map(author => {
                    const authorProfile = authorProfiles[author] || '';
                    if (authorProfile) {
                        return `<a href="${authorProfile}" target="_blank">
                                    <img style="height: 2em; width: auto; background: none; vertical-align: middle;" src="https://visualpharm.com/assets/652/Pen-595b40b75ba036ed117d9a7d.svg" alt="Author Image">
                                    ${author}
                                </a>`;
                    } else {
                        return `<img style="height: 2em; width: auto; background: none; vertical-align: middle;" src="https://visualpharm.com/assets/652/Pen-595b40b75ba036ed117d9a7d.svg" alt="Author Image">
                                ${author}`;
                    }
                }).join('  ');
            }
        
            digimonDetails.innerHTML = `
                <button onclick="closeDetails()">X</button>
                <h2>${digimon.Name}</h2>
                <div class="digimon-info">
                    <div class="category-tag ${digimon.Category.toLowerCase().replace(/\s+/g, '-')}">${digimon.Category}</div>
                    <h3>${digimon.Stage} - ${digimon.Attribute} - ${digimon.Type}</h3>
                </div>
                <div class="art-container">
                    <img id="digimon-image" src="images/${digimon.Name}.png" alt="${digimon.Name}">
                </div>
                <div style="line-height: 2em; display:flex!important; flex-direction:column!important; font-weight:bold;margin:16px;gap:5px;">
                    ${authorsHTML}
                </div>
                <div class="profile">
                    <h3>Profile</h3>
                    <p>${digimon.Description}</p>
                </div>
                ${galleryHTML}
            `;
        
            if (evolveFromHTML !== '' || evolveToHTML !== '') {
                digimonDetails.innerHTML += `
                <div style="display: flex; align-items: center; position: relative;padding:8px;">
                <h3 style="margin: 0 auto 0 0; position: absolute; left: 50%; transform: translateX(-50%);">Evolutions</h3>
                <a href="/tree.html#${digimon.Name}" target="_blank" style="margin-left: auto;">
                  <div style="border: 2px solid black; width: fit-content; padding: 8px; border-radius: 12px; color:black;"> 
                    See Evolution tree 
                  </div>
                </a>
              </div>
              
                              <div class="evolution">

                    ${evolveFromHTML !== '' ? `
                    <div class="evolve-from">
                        <h4>Evolves From</h4>
                        ${evolveFromHTML}
                    </div>` : ''}
                    ${evolveToHTML !== '' ? `
                    <div class="evolve-to">
                        <h4>Evolves To</h4>
                        ${evolveToHTML}
                    </div>` : ''}
                </div>`;
            }
        
            if (variationsHTML !== '') {
                digimonDetails.innerHTML += `
                    <h3>Subspecies/Variations</h3>
                    <div class="variations">
                        ${variationsHTML}
                    </div>
                `;
            }
        
            // Verificar se existem imagens adicionais e adicionar o botão de toggle
            const imagePaths = [];
            let imageIndex = 0;
        
            for (let i = 0; i < 10; i++) {
                const imagePath = i === 0 ? `images/${digimon.Name}.png` : `images/${digimon.Name}(${i}).png`;
                const img = new Image();
                img.src = imagePath;
                img.onload = function() {
                    imagePaths.push(imagePath);
                    if (imagePaths.length > 1 && !document.getElementById('toggle-art-button')) {
                        const artContainer = document.querySelector('.art-container');
                        const toggleArtButton = document.createElement('button');
                        toggleArtButton.id = 'toggle-art-button';
                        toggleArtButton.onclick = function() {
                            imageIndex = (imageIndex + 1) % imagePaths.length;
                            const digimonImage = document.getElementById('digimon-image');
                            digimonImage.src = imagePaths[imageIndex];
                        };
                        artContainer.appendChild(toggleArtButton);
                    }
                };
            }
        
            addLinkHandlers();
        }
        
        

        function parseEvolution(evolution) {
            if (!evolution) return '';
            const evolutions = evolution.split(',').map(name => name.trim()).filter(Boolean);
            if (evolutions.length === 0) return '';
            return evolutions.map(name => {
                const match = name.match(/^([^\[]+)(?:\s*\[(.+)\])?$/);
                const digimonName = match ? match[1].trim() : name;
                const additionalInfo = match && match[2] ? match[2].trim() : '';

                const digimon = data.find(d => d.Name === digimonName && (!d.Hide || d.Hide.toLowerCase() !== 'true'));
                if (digimon) {
                    return `<div class="evolution-card" data-name="${digimonName}">
                                <img src="images/${digimonName}.png" alt="${digimonName}">
                                <div class="evolution-details">
                                    <p><b>${digimonName}</b></p>
                                    ${additionalInfo ? `<p>${additionalInfo}</p>` : ''}
                                    ${digimon.Category !== 'Alt Version' ? `<div class="evo-tag category-tag ${digimon.Category.toLowerCase().replace(/\s+/g, '-')}">${digimon.Category}</div>` : ''}
                                </div>
                            </div>`;
                }
                return ''; // Return empty string if digimon not found or hidden
            }).join('');
        }

        function parseVariations(variations) {
            if (!variations) return '';
            const variationList = variations.split(',').map(name => name.trim()).filter(Boolean);
            if (variationList.length === 0) return '';
            return variationList.map(name => {
                const match = name.match(/^([^\[]+)(?:\s*\[(.+)\])?$/);
                const digimonName = match ? match[1].trim() : name;
                const additionalInfo = match && match[2] ? match[2].trim() : '';

                const digimon = data.find(d => d.Name === digimonName && (!d.Hide || d.Hide.toLowerCase() !== 'true'));
                if (digimon) {
                    return `<div class="variation-card" data-name="${digimonName}">
                                <img src="images/${digimonName}.png" alt="${digimonName}">
                                <div class="variations-details">
                                    <p><b>${digimonName}</b></p>
                                    ${additionalInfo ? `<p>${additionalInfo}</p>` : ''}
                                    ${digimon.Category !== 'Alt Version' ? `<div class=" var-tag category-tag ${digimon.Category.toLowerCase().replace(/\s+/g, '-')}">${digimon.Category}</div>` : ''}

                                </div>
                            </div>`;
                }
                return ''; // Return empty string if digimon not found or hidden
            }).join('');
        }

        function parseGallery(gallery) {
            if (!gallery) return '';
            const images = gallery.split(',').map(item => {
                const match = item.match(/^(.+)\s\[Art by:(.+?) url=\s*(https?:\/\/[^\]]+)\]$/);
                const imageUrl = match ? match[1].trim() : item.trim();
                const artist = match ? match[2].trim() : '';
                const artistLink = match ? match[3].trim() : '';
                const description = artist ? `Art by: ${artist}` : '';
                return { imageUrl, artistLink, description };
            });

            return `
                <div class="gallery">
                    <h3>Gallery</h3>
                    <div class="gallery-container">
                        ${images.map(image => `
                            <a href="${image.artistLink}" target="_blank" class="gallery-item-link">
                                <div class="gallery-item">
                                    <img src="./images/${image.imageUrl}">
                                    <div class="gallery-desc">${image.description}</div>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        function addLinkHandlers() {
            document.querySelectorAll('.evolution-card, .variation-card').forEach(element => {
                element.addEventListener('click', (e) => {
                    e.stopPropagation();  // Prevent triggering the parent click event
                    const digimonName = element.getAttribute('data-name');
                    const digimon = data.find(d => d.Name === digimonName);
                    if (digimon) {
                        showDetails(digimon);
                    }
                });
            });
        }

        window.closeDetails = function() {
            container.classList.add('closing');
            overlay.classList.add('closing');
            window.location.hash = '';
        
            container.addEventListener('animationend', function() {
                container.classList.add('hidden');
                container.classList.remove('closing');
            }, { once: true });
        
            overlay.addEventListener('animationend', function() {
                overlay.classList.add('hidden');
                overlay.classList.remove('closing');
                const scrollY = document.body.style.top;
                document.body.style.position = '';
                document.body.style.top = '';
                window.scrollTo(0, parseInt(scrollY || '0') * -1);  // Restore the scroll position
            }, { once: true });
        }

        if (window.location.hash) {
            const digimonName = window.location.hash.substring(1).replace(/_/g, ' ');
            const digimon = data.find(d => d.Name.toLowerCase() === digimonName.toLowerCase());
            if (digimon) {
                showDetails(digimon);
            }
        }
    }).catch(function(error) {
        console.error('Error loading the CSV file:', error);
    });

});

window.addEventListener('scroll', function() {
    var navbar = document.getElementById('myTopnav');

    if (window.scrollY > 0) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});
