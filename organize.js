window.onload = function() {
    fetch('digimons.csv')
        .then(response => response.text())
        .then(data => {
            let csvData = data.split('\n').slice(1); // Remove the header row

            let cards = [];
            let spritesheets = [];
            let groups = {};

            csvData.forEach(row => {
                let cols = row.split(',');

                // Skip if row is not valid
                if (cols.length < 4) return;

                if (!groups[cols[3]]) {
                    groups[cols[3]] = {};
                }

                if (!groups[cols[3]][cols[1]]) {
                    groups[cols[3]][cols[1]] = [];
                }

                groups[cols[3]][cols[1]].push({
                    name: cols[0],
                    isSpritesheet: cols[2] === 'True'
                });
            });

            // Get the groups container
            var groupsContainer = document.querySelector('#groups');

            // Process all groups
            let groupId = 0;
            for(let group in groups) {
                let groupContainer = document.createElement('div');
                groupContainer.innerHTML = `
                    <div class="tab-pane fade" id="group-${groupId}" role="tabpanel">
                        <ul class="nav nav-tabs" role="tablist"></ul>
                        <div class="tab-content"></div>
                    </div>
                `;
                groupsContainer.appendChild(groupContainer);

                // Process all sections within this group
                let sectionId = 0;
                for(let section in groups[group]) {
                    let sectionContainer = groupContainer.querySelector('.tab-content');
                    let sectionTab = groupContainer.querySelector('.nav-tabs');

                    let newSectionTab = document.createElement('li');
                    newSectionTab.classList.add('nav-item');
                    newSectionTab.innerHTML = `<a class="nav-link" id="section-${sectionId}-tab" data-toggle="tab" href="#section-${sectionId}" role="tab" aria-controls="section-${sectionId}" aria-selected="false">${section}</a>`;
                    sectionTab.appendChild(newSectionTab);

                    let newSection = document.createElement('div');
                    newSection.classList.add('tab-pane', 'fade');
                    newSection.id = `section-${sectionId}`;
                    newSection.role = 'tabpanel';
                    newSection.ariaLabelledBy = `section-${sectionId}-tab`;

                    // Sort and create elements
                    groups[group][section].sort((a, b) => a.name.localeCompare(b.name)).forEach(digimon => {
                        let card = document.createElement('div');
                        card.classList.add('card');

                        if (digimon.isSpritesheet) {
                            card.classList.add('spritesheet');
                            spritesheets.push(card);
                        } else {
                            cards.push(card);
                        }

                        let img = document.createElement('img');
                        img.src = `Sprites/${digimon.name}.png`; // Use the Digimon's name to find the image
                        img.alt = digimon.name;
                        card.appendChild(img);

                        let p = document.createElement('p');
                        p.textContent = digimon.name;
                        card.appendChild(p);

                        newSection.appendChild(card);
                    });

                    sectionContainer.appendChild(newSection);
                    sectionId++;
                }

                groupId++;
            }

            var counterDiv = document.querySelector('.counter');
            counterDiv.textContent = "Total de cards: " + (cards.length + spritesheets.length) + ", Total de spritesheets: " + spritesheets.length;
        });
};
