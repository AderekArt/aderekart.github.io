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
                    stages[stage].sort((a, b) => a.Name.localeCompare(b.Name));

                    const stageSection = document.createElement('div');
                    stageSection.className = 'stage-section';

                    const stageHeader = document.createElement('h2');
                    stageHeader.textContent = stage;
                    stageSection.appendChild(stageHeader);

                    const cardsContainer = document.createElement('div');
                    cardsContainer.className = 'digimon-cards-container';
                    stageSection.appendChild(cardsContainer);

                    stages[stage].forEach(digimon => {
                        const card = document.createElement('div');
                        card.className = `digimon-card ${digimon.Stage.toLowerCase()}`;
                        card.innerHTML = `
                            <img src="images/${digimon.Name}.png" alt="${digimon.Name}">
                            <h3>${digimon.Name}</h3>
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
            lastScrollPosition = window.scrollY;  // Save the current scroll position
            document.body.style.position = 'fixed';
            document.body.style.top = `-${lastScrollPosition}px`;

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
            }
        }

        function displayDetails(digimon) {
            overlay.classList.remove('hidden');
            container.classList.remove('hidden');
            digimonDetails.className = '';
            digimonDetails.classList.add(digimon.Stage.toLowerCase());

            window.location.hash = digimon.Name;

            const evolveFromHTML = parseEvolution(digimon['Evolve From']);
            const evolveToHTML = parseEvolution(digimon['Evolve To']);
            const variationsHTML = parseVariations(digimon['Alternative']);
            digimonDetails.innerHTML = `
                <button onclick="closeDetails()">X</button>
                <h2>${digimon.Name}</h2>
                <div class="digimon-info">
                    <h3>${digimon.Stage} - ${digimon.Attribute} - ${digimon.Type}</h3>
                </div>
                <img src="images/${digimon.Name}.png" alt="${digimon.Name}">
                <p style="line-height: 2em;">
                    <img style="height: 2em; width: auto; background: none; vertical-align: middle;" src="https://visualpharm.com/assets/652/Pen-595b40b75ba036ed117d9a7d.svg" alt="Author Image">
                    <b>${digimon.Author}</b>
                </p>
                <div class="profile">
                <h3>Profile</h3>
                <p>${digimon.Description}</p>
                </div>
            `;

            if (evolveFromHTML !== '<p>None</p>' || evolveToHTML !== '<p>None</p>') {
                digimonDetails.innerHTML += `
                <div class="evolution">
                    ${evolveFromHTML !== '<p>None</p>' ? `
                    <div class="evolve-from">
                        <h3>Evolves From</h3>
                        ${evolveFromHTML}
                    </div>` : ''}
                    ${evolveToHTML !== '<p>None</p>' ? `
                    <div class="evolve-to">
                        <h3>Evolves To</h3>
                        ${evolveToHTML}
                    </div>` : ''}
                </div>`;
            }

            if (variationsHTML !== '<p>None</p>') {
                digimonDetails.innerHTML += `
                    <h3>Subspecies/Variations</h3>
                    <div class="variations">
                        ${variationsHTML}
                    </div>
                `;
            }
            addLinkHandlers();
        }

        function parseEvolution(evolution) {
            if (!evolution) return '<p>None</p>';
            const evolutions = evolution.split(',').map(name => name.trim()).filter(Boolean);
            if (evolutions.length === 0) return '<p>None</p>';
            return evolutions.map(name => {
                const match = name.match(/^([^\[]+)(?:\s*\[(.+)\])?$/);
                const digimonName = match ? match[1].trim() : name;
                const additionalInfo = match && match[2] ? match[2].trim() : '';

                const digimon = data.find(d => d.Name === digimonName && (!d.Hide || d.Hide.toLowerCase() !== 'true'));
                if (digimon) {
                    return `<div class="evolution-card" data-name="${digimonName}">
                                <img src="images/${digimonName}.png" alt="${digimonName}">
                                <div>
                                    <p><b>${digimonName}</b></p>
                                    ${additionalInfo ? `<p>${additionalInfo}</p>` : ''}
                                </div>
                            </div>`;
                }
                return ''; // Return empty string if digimon not found or hidden
            }).join('');
        }

        function parseVariations(variations) {
            if (!variations) return '<p>None</p>';
            const variationList = variations.split(',').map(name => name.trim()).filter(Boolean);
            if (variationList.length === 0) return '<p>None</p>';
            return variationList.map(name => {
                const match = name.match(/^([^\[]+)(?:\s*\[(.+)\])?$/);
                const digimonName = match ? match[1].trim() : name;
                const additionalInfo = match && match[2] ? match[2].trim() : '';

                const digimon = data.find(d => d.Name === digimonName && (!d.Hide || d.Hide.toLowerCase() !== 'true'));
                if (digimon) {
                    return `<div class="variation-card" data-name="${digimonName}">
                                <img src="images/${digimonName}.png" alt="${digimonName}">
                                <div>
                                    <p><b>${digimonName}</b></p>
                                    ${additionalInfo ? `<p>${additionalInfo}</p>` : ''}
                                </div>
                            </div>`;
                }
                return ''; // Return empty string if digimon not found or hidden
            }).join('');
        }

        function addLinkHandlers() {
            document.querySelectorAll('.evolution-card, .variation-card').forEach(element => {
                element.addEventListener('click', (e) => {
                    e.stopPropagation();  // Prevent triggering the parent click event
                    const digimonName = element.getAttribute('data-name');
                    const digimon = data.find(d => d.Name === digimonName);
                    if (digimon) {
                        updateDetails(digimon);
                    }
                });
            });
        }

        function updateDetails(digimon) {
            digimonDetails.className = '';
            digimonDetails.classList.add(digimon.Stage.toLowerCase());

            window.location.hash = digimon.Name;

            const evolveFromHTML = parseEvolution(digimon['Evolve From']);
            const evolveToHTML = parseEvolution(digimon['Evolve To']);
            const variationsHTML = parseVariations(digimon['Alternative']);
            digimonDetails.innerHTML = `
                <button onclick="closeDetails()">X</button>
                <h2>${digimon.Name}</h2>
                <div class="digimon-info">
                    <h3>${digimon.Stage} - ${digimon.Attribute} - ${digimon.Type}</h3>
                </div>
                <img src="images/${digimon.Name}.png" alt="${digimon.Name}">
                <p style="line-height: 2em;">
                    <img style="height: 2em; width: auto; background: none; vertical-align: middle;" src="https://visualpharm.com/assets/652/Pen-595b40b75ba036ed117d9a7d.svg" alt="Author Image">
                    <b>${digimon.Author}</b>
                </p>
                <div class="profile">
                <h3>Profile</h3>
                <p>${digimon.Description}</p>
                </div>
            `;

            if (evolveFromHTML !== '<p>None</p>' || evolveToHTML !== '<p>None</p>') {
                digimonDetails.innerHTML += `
                <div class="evolution">
                    ${evolveFromHTML !== '<p>None</p>' ? `
                    <div class="evolve-from">
                        <h3>Evolves From</h3>
                        ${evolveFromHTML}
                    </div>` : ''}
                    ${evolveToHTML !== '<p>None</p>' ? `
                    <div class="evolve-to">
                        <h3>Evolves To</h3>
                        ${evolveToHTML}
                    </div>` : ''}
                </div>`;
            }

            if (variationsHTML !== '<p>None</p>') {
                digimonDetails.innerHTML += `
                    <h3>Subspecies/Variations</h3>
                    <div class="variations">
                        ${variationsHTML}
                    </div>
                `;
            }
            addLinkHandlers();
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
            const digimonName = window.location.hash.substring(1);
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
