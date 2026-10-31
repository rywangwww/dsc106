import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = (await fetchJSON('../lib/projects.json')) ?? [];
const projectsContainer = document.querySelector('.projects');

const projectsTitle = document.querySelector('.projects-title');
if (projectsTitle) {
  projectsTitle.textContent = `${projects.length} Projects`;
}

// Filter state. The selected wedge is tracked by its year (label) rather than
// its index, because indices shift when the search removes some years.
let query = '';
let selectedYear = null;

// Color by year so each year keeps its color as the data is filtered.
const years = [...new Set(projects.map((p) => p.year))].sort();
const colors = d3.scaleOrdinal(d3.schemeTableau10).domain(years);

const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const sliceGenerator = d3.pie().value((d) => d.value).sort(null);

function matchesQuery(project) {
  let values = Object.values(project).join('\n').toLowerCase();
  return values.includes(query.toLowerCase());
}

function update() {
  // Apply both filters together: the pie shows the search results,
  // and the project list shows the search results for the selected year.
  let searchedProjects = projects.filter(matchesQuery);
  let visibleProjects =
    selectedYear === null
      ? searchedProjects
      : searchedProjects.filter((p) => p.year === selectedYear);

  renderProjects(visibleProjects, projectsContainer, 'h2');
  renderPieChart(searchedProjects);
}

function renderPieChart(projectsGiven) {
  let rolledData = d3
    .rollups(
      projectsGiven,
      (v) => v.length,
      (d) => d.year,
    )
    .sort(([a], [b]) => d3.ascending(a, b));

  let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  let arcData = sliceGenerator(data);
  let arcs = arcData.map((d) => arcGenerator(d));

  let svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();

  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  arcs.forEach((arc, i) => {
    let d = data[i];
    svg
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(d.label))
      .attr('class', d.label === selectedYear ? 'selected' : null)
      .on('click', () => selectYear(d.label))
      .append('title')
      .text(`${d.label}: ${d.value} project${d.value === 1 ? '' : 's'}`);
  });

  data.forEach((d) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(d.label)}`)
      .attr('class', d.label === selectedYear ? 'legend-item selected' : 'legend-item')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => selectYear(d.label));
  });
}

function selectYear(year) {
  selectedYear = selectedYear === year ? null : year;
  update();
}

let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  update();
});

update();
