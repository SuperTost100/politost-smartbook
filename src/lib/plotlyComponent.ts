import createPlotlyComponent from 'react-plotly.js/factory';
// The cartesian build has every trace plotlySanitize allows (scatter, bar, histogram, box, pie)
// at a third of the full build's size (1.5 MB instead of 4.8 MB minified).
import Plotly from 'plotly.js/dist/plotly-cartesian.min.js';

export const Plot = createPlotlyComponent(Plotly);
