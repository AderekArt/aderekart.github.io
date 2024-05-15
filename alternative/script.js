document.addEventListener('DOMContentLoaded', function() {
    d3.csv('data/digimons.csv').then(function(data) {
        // Agrupa os Digimons por fase
        const stages = {};
        data.forEach(digimon => {
            if (!stages[digimon.Stage]) {
                stages[digimon.Stage] = [];
            }
            stages[digimon.Stage].push(digimon);
        });

        const digimonList = document.getElementById('digimon-list');
        const overlay = document.getElementById('overlay');
        const digimonDetails = document.getElementById('digimon-details');
        const container = document.querySelector('.container');

        // Cria seções para cada fase
        for (const stage in stages) {
            if (stages.hasOwnProperty(stage)) {
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

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDetails();
            }
        });

        function showDetails(digimon) {
            // Adiciona animação de fechamento se já estiver aberto
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
            document.body.classList.add('no-scroll'); // Bloqueia o scroll no body
            digimonDetails.className = ''; // Resetar classes anteriores
            digimonDetails.classList.add(digimon.Stage.toLowerCase()); // Adicionar a nova classe de estágio

            // Atualiza o hash na URL
            window.location.hash = digimon.Name;

            const evolveFromHTML = parseEvolution(digimon['Evolve From']);
            const evolveToHTML = parseEvolution(digimon['Evolve To']);
            const variationsHTML = parseVariations(digimon['Alternative']);

            digimonDetails.innerHTML = `
                <button onclick="closeDetails()">X</button>
                <h2>${digimon.Name}</h2>
                <div class="digimon-info">
                    <h3>${digimon.Stage} - ${digimon.Attribute} -  ${digimon.Type}</h3>
                </div>
                <img src="images/${digimon.Name}.png" alt="${digimon.Name}">
                <p style="line-height: 2em;">
                <img style="height: 2em; width: auto; background: none; vertical-align: middle;" src="https://visualpharm.com/assets/652/Pen-595b40b75ba036ed117d9a7d.svg" alt="Author Image">
                <b>${digimon.Author}</b>
            </p>
                            <h3>Profile</h3>
                <p>${digimon.Description}</p> </div>
                <div class="evolution">
                    <div class="evolve-from">
                        <h3>Evolve From</h3>
                        ${evolveFromHTML}
                    </div>
                    <div class="evolve-to">
                        <h3>Evolve To</h3>
                        ${evolveToHTML}
                    </div>
                </div>
                <h3>Subspecies/Variations</h3>
                <div class="variations">
                    ${variationsHTML}
                </div>
            `;

            addLinkHandlers();
        }

        function parseEvolution(evolution) {
            if (!evolution) return '<p>None</p>';
            return evolution.split(',').map(name => name.trim()).filter(Boolean).map(name => {
                const digimon = data.find(d => d.Name === name);
                return `<div class="evolution-card" data-name="${name}">
                            <img src="images/${name}.png" alt="${name}">
                            <b>${name}</b>
                        </div>`;
            }).join('');
        }

        function parseVariations(variations) {
            if (!variations) return '<p>None</p>';
            return variations.split(',').map(name => name.trim()).filter(Boolean).map(name => {
                const digimon = data.find(d => d.Name === name);
                return `<div class="variation-card" data-name="${name}">
                            <img src="images/${name}.png" alt="${name}">
                            <b>${name}</b>
                        </div>`;
            }).join('');
        }

        function addLinkHandlers() {
            document.querySelectorAll('.evolution-card, .variation-card').forEach(element => {
                element.addEventListener('click', () => {
                    const digimonName = element.getAttribute('data-name');
                    const digimon = data.find(d => d.Name === digimonName);
                    if (digimon) {
                        showDetails(digimon);
                    }
                });
            });
        }

        window.closeDetails = function() {
            container.classList.add('closing'); // Adiciona a classe closing para a animação de descida
            overlay.classList.add('closing');
            document.body.classList.remove('no-scroll'); // Desbloqueia o scroll no body
            window.location.hash = ''; // Remove o hash da URL ao fechar o popup

            // Espera a animação de fechamento concluir antes de realmente esconder o contêiner
            container.addEventListener('animationend', function() {
                container.classList.add('hidden'); // Adiciona a classe hidden após a animação
                container.classList.remove('closing'); // Remove a classe closing após a animação
            }, { once: true });

            overlay.addEventListener('animationend', function() {
                overlay.classList.add('hidden'); // Adiciona a classe hidden após a animação
                overlay.classList.remove('closing'); // Remove a classe closing após a animação
            }, { once: true });
        }

        // Verifica o hash na URL ao carregar a página
        if (window.location.hash) {
            const digimonName = window.location.hash.substring(1); // Remove o '#' do início
            const digimon = data.find(d => d.Name.toLowerCase() === digimonName.toLowerCase());
            if (digimon) {
                showDetails(digimon);
            }
        }
    }).catch(function(error) {
        console.error('Error loading the CSV file:', error);
    });
});
