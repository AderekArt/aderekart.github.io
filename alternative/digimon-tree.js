document.addEventListener('DOMContentLoaded', function() {
    d3.csv('data/digimons.csv').then(function(data) {
        const hash = window.location.hash.substring(1).toLowerCase();
        const svg = d3.select('#evolution-tree');
        const nodeWidth = 100;
        const nodeHeight = 120;
        const nodeSpacingX = 20;
        const nodeSpacingY = 40;

        const filteredData = data.filter(d => !d.Hide || d.Hide.toLowerCase() !== 'true');

        const evolveMap = {};
        filteredData.forEach(digimon => {
            if (digimon['Evolve To']) {
                const evolveTos = digimon['Evolve To'].split(',').map(name => name.trim());
                evolveTos.forEach(evolveTo => {
                    const match = evolveTo.match(/^([^\[]+)(?:\s*\[(.+)\])?$/);
                    const evolveToName = match ? match[1].trim() : evolveTo;
                    const additionalInfo = match && match[2] ? match[2].trim() : '';

                    if (!evolveMap[digimon.Name]) {
                        evolveMap[digimon.Name] = [];
                    }
                    evolveMap[digimon.Name].push({ name: evolveToName, info: additionalInfo });
                });
            }
        });

        const nodeCache = new Map();

        function createNodes() {
            filteredData.forEach(digimon => {
                if (!nodeCache.has(digimon.Name)) {
                    const node = { name: digimon.Name, parents: [], children: [] };
                    nodeCache.set(digimon.Name, node);
                }
            });
        }

        function mapRelations() {
            nodeCache.forEach(node => {
                const evolutions = evolveMap[node.name];
                if (evolutions) {
                    evolutions.forEach(evolution => {
                        const childNode = nodeCache.get(evolution.name);
                        if (childNode) {
                            if (!node.children.includes(childNode)) {
                                node.children.push(childNode);
                            }
                            if (!childNode.parents.includes(node)) {
                                childNode.parents.push(node);
                            }
                        }
                    });
                }
            });
        }

        const baseDigimon = filteredData.find(d => d.Name.toLowerCase() === hash);

        if (baseDigimon) {
            createNodes();
            mapRelations();

            function collectAllAncestors(node, ancestors, depth = 0) {
                if (!ancestors.has(node)) {
                    node.depth = depth;
                    ancestors.add(node);
                    node.parents.forEach(parent => collectAllAncestors(parent, ancestors, depth - 1));
                }
            }

            function collectAllDescendants(node, descendants, depth = 0) {
                if (!descendants.has(node)) {
                    node.depth = depth;
                    descendants.add(node);
                    node.children.forEach(child => collectAllDescendants(child, descendants, depth + 1));
                }
            }

            const baseNode = nodeCache.get(baseDigimon.Name);
            const allAncestors = new Set();
            const allDescendants = new Set();

            collectAllAncestors(baseNode, allAncestors);
            collectAllDescendants(baseNode, allDescendants);

            const relevantNodes = new Set([...allAncestors, ...allDescendants]);
            const relevantLinks = new Set();

            relevantNodes.forEach(node => {
                node.children.forEach(child => {
                    relevantLinks.add({ source: node, target: child });
                });
            });

            // Manual layout positioning
            const levelHeight = nodeHeight + nodeSpacingY;
            const levels = {};

            relevantNodes.forEach(node => {
                if (!levels[node.depth]) levels[node.depth] = [];
                levels[node.depth].push(node);
            });

            const existingNodes = new Map();
            for (const depth in levels) {
                if (levels.hasOwnProperty(depth)) {
                    const nodesAtLevel = levels[depth];
                    const totalWidth = nodesAtLevel.length * (nodeWidth + nodeSpacingX) - nodeSpacingX;
                    const offsetX = (svg.attr('width') - totalWidth) / 2;
                    let positionIndex = 0;

                    nodesAtLevel.forEach((node, i) => {
                        if (!existingNodes.has(node.name)) {
                            node.x = offsetX + positionIndex * (nodeWidth + nodeSpacingX);
                            node.y = (parseInt(depth) + 1) * levelHeight;
                            positionIndex++;
                            existingNodes.set(node.name, { x: node.x, y: node.y });
                        } else {
                            const existingNode = existingNodes.get(node.name);
                            node.x = existingNode.x;
                            node.y = existingNode.y;
                        }
                    });
                }
            }

            const minX = Math.min(...Array.from(relevantNodes).map(d => d.x));
            const maxX = Math.max(...Array.from(relevantNodes).map(d => d.x));
            const minY = Math.min(...Array.from(relevantNodes).map(d => d.y));
            const maxY = Math.max(...Array.from(relevantNodes).map(d => d.y));
            const svgWidth = maxX - minX + nodeWidth + nodeSpacingX * 2;
            const svgHeight = maxY - minY + nodeHeight + nodeSpacingY * 2;

            // Set the SVG height to the container height and adjust width accordingly
            const containerHeight = document.getElementById('evolution-tree').clientHeight;
            const containerWidth = document.getElementById('evolution-tree').clientWidth;

            const aspectRatio = svgWidth / svgHeight;
            const adjustedWidth = containerHeight * aspectRatio;

            svg.attr('viewBox', `${minX - nodeSpacingX} ${minY - nodeSpacingY} ${svgWidth} ${svgHeight}`)
                .attr('width', '100%')
                .attr('height', '100%');

            const g = svg.append('g')

            const initialTranslateX = 0
            const zoom = d3.zoom()
                .scaleExtent([1, 3])
                .translateExtent([[minX - nodeSpacingX, minY - nodeSpacingY], [maxX + nodeWidth + nodeSpacingX, maxY + nodeHeight + nodeSpacingY]])
                .on('zoom', function(event) {
                    g.attr('transform', event.transform);
                });

            // Apply the initial transform
            svg.call(zoom)
                .call(zoom.transform, d3.zoomIdentity.translate(initialTranslateX, 0));

            // Detect if the device is mobile
            const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (isMobile()) {
                svg.call(zoom)
                    .on("touchstart.zoom", null)
                    .on("touchmove.zoom", null)
                    .on("touchend.zoom", null)
                    .on("touchstart", function(event) {
                        const touches = event.touches;
                        if (touches.length === 2) {
                            const p1 = [touches[0].clientX, touches[0].clientY];
                            const p2 = [touches[1].clientX, touches[1].clientY];
                            const dist = Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
                            svg.attr('data-touch-dist', dist);
                        }
                    })
                    .on("touchmove", function(event) {
                        const touches = event.touches;
                        if (touches.length === 2) {
                            const p1 = [touches[0].clientX, touches[0].clientY];
                            const p2 = [touches[1].clientX, touches[1].clientY];
                            const dist = Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
                            const initialDist = svg.attr('data-touch-dist');
                            if (initialDist) {
                                const scale = dist / initialDist;
                                const transform = d3.zoomTransform(svg.node());
                                const newTransform = transform.scale(scale);
                                g.attr('transform', newTransform);
                            }
                        }
                    });
            }

            const nodes = g.selectAll('.node')
                .data(Array.from(relevantNodes), d => d.name)
                .enter()
                .append('g')
                .attr('id', d => `node-${d.name}`)
                .attr('class', d => `node ${getStageClass(d.name)}`)
                .attr('transform', d => `translate(${d.x},${d.y})`)
                .on('mouseover', function(event, d) {
                    highlightDuplicateNodes(d, true);
                })
                .on('mouseout', function(event, d) {
                    highlightDuplicateNodes(d, false);
                })
                .on('click', function(event, d) {
                    window.location.href = `/nidex.html#${d.name}`;
                });

            nodes.append('rect')
                .attr('width', nodeWidth)
                .attr('height', nodeHeight)
                .attr('rx', 10)
                .attr('ry', 10);

            nodes.append('image')
                .attr('x', 20)
                .attr('y', 10)
                .attr('width', 60)
                .attr('height', 60)
                .attr('xlink:href', d => {
                    const digimon = filteredData.find(digi => digi.Name === d.name);
                    return digimon ? `images/${digimon.Name}.png` : '';
                });

            nodes.append('text')
                .attr('x', nodeWidth / 2)
                .attr('y', 96)
                .text(d => d.name);

            const links = g.selectAll('.link')
                .data(Array.from(relevantLinks))
                .enter()
                .append('path')
                .attr('class', 'link')
                .attr('d', d => {
                    const startX = d.source.x + nodeWidth / 2;
                    const startY = d.source.y + nodeHeight;
                    const endX = d.target.x + nodeWidth / 2;
                    const endY = d.target.y;
                    return `M${startX},${startY} V${startY + (endY - startY) / 2} H${endX} V${endY}`;
                })
                .attr('stroke', 'black')
                .attr('fill', 'none');

            function getStageClass(digimonName) {
                const digimon = filteredData.find(d => d.Name === digimonName);
                let stageClass = digimon ? digimon.Stage.toLowerCase().replace(/\s+/g, '-') : '';
                if (digimon && digimon.Name.toLowerCase() === baseDigimon.Name.toLowerCase()) {
                    stageClass += ' base-digimon';
                }
                return stageClass;
            }

            function highlightLinks(node, highlight) {
                const allLinks = new Set();

                function collectAncestors(current) {
                    current.parents.forEach(parent => {
                        allLinks.add(parent.name + '-' + current.name);
                        collectAncestors(parent);
                    });
                }

                function collectDescendants(current) {
                    current.children.forEach(child => {
                        allLinks.add(current.name + '-' + child.name);
                        collectDescendants(child);
                    });
                }

                collectAncestors(node);
                collectDescendants(node);

                links.classed('highlight', function(d) {
                    return allLinks.has(d.source.name + '-' + d.target.name) ? highlight : d3.select(this).classed('highlight');
                });

                if (highlight) {
                    links.filter(d => allLinks.has(d.source.name + '-' + d.target.name)).raise();
                }
            }

            function highlightDuplicateNodes(node, highlight) {
                const allLinks = new Map();
                const duplicateNodes = Array.from(relevantNodes).filter(d => d.name === node.name);

                const collectAncestors = (currentNode, index) => {
                    currentNode.parents.forEach(parent => {
                        const linkKey = `${parent.name}->${currentNode.name}`;
                        if (!allLinks.has(linkKey)) {
                            allLinks.set(linkKey, { source: parent.name, target: currentNode.name, index: index });
                            collectAncestors(parent, index);
                        }
                    });
                };

                const collectDescendants = (currentNode, index) => {
                    currentNode.children.forEach(child => {
                        const linkKey = `${currentNode.name}->${child.name}`;
                        if (!allLinks.has(linkKey)) {
                            allLinks.set(linkKey, { source: currentNode.name, target: child.name, index: 1 });
                            collectDescendants(child, 1);
                        }
                    });
                };

                duplicateNodes.forEach((duplicateNode, duplicateIndex) => {
                    duplicateNode.parents.forEach((parent, parentIndex) => {
                        const linkKey = `${parent.name}->${duplicateNode.name}`;
                        const highlightIndex = parentIndex + 1;
                        allLinks.set(linkKey, { source: parent.name, target: duplicateNode.name, index: highlightIndex });
                        collectAncestors(parent, highlightIndex);
                    });

                    duplicateNode.children.forEach((child, childIndex) => {
                        const linkKey = `${duplicateNode.name}->${child.name}`;
                        const highlightIndex = childIndex + 1;
                        allLinks.set(linkKey, { source: duplicateNode.name, target: child.name, index: 1 });
                        collectDescendants(child, 1);
                    });
                });

                links.classed('highlight1', false)
                    .classed('highlight2', false)
                    .classed('highlight3', false);

                allLinks.forEach(link => {
                    links.filter(d => d.source.name === link.source && d.target.name === link.target)
                        .classed(`highlight${link.index}`, highlight);
                });

                if (highlight) {
                    allLinks.forEach(link => {
                        links.filter(d => d.source.name === link.source && d.target.name === link.target).raise();
                    });
                }
            }

        } else {
            console.error('Digimon not found');
        }
    }).catch(function(error) {
        console.error('Error loading the CSV file:', error);
    });
});
