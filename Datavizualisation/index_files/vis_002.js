/*
 * visualisation of modification dates
 *
 *
 *  By Gregor Aisch (https://driven-by-data.net/)
 *
 * Released under the GPL v3 license.
 * deps: jquery, raphaeljs
 *
 */


function visualiseModificationDates(laws) {

    var
        gridCircAttr = { 'stroke-width': 0.3 },
        gridCircLabelAttr = { 'font-family': 'Helvetica Neue', 'font-size': 11, 'font-weight': 300, opacity: 0.5 },
        lawDotAttr = { stroke: 'none', fill: '#444444' },
        monthLabelAttr = { opacity: 0.6, 'font-family': 'Helvetica Neue', 'font-size': 12, 'font-weight': 300 },
        summerBreakAttr = { fill: 'orange', stroke: 'none', opacity: 0.1 },
        winterBreakAttr = { fill: 'steelblue', stroke: 'none', opacity: 0.1 },
        outerRad=200,
        innerRad=50,
        cx = 280,
        cy = 250;

    function dayOfYear(date) {
        return Math.round((date - new Date(date.getFullYear(), 0, 1)) / 86400000);
    }

    function date2angle(date) {
        return (dayOfYear(date) / 365) * Math.PI * 2 - Math.PI * 0.5;
    }

    var minYear=2050, maxYear=1900;

    function year2rad(year) {
        return (year - minYear) / (maxYear - minYear) * (outerRad-innerRad) + innerRad;
    }

    function law2xy(law) {
        var
            rad = year2rad(law.publishDate.getFullYear()),
            phi = date2angle(law.publishDate),
            x = cx + Math.cos(phi) * rad,
            y = cy + Math.sin(phi) * rad;
        return [x,y];
    }

    // parse dates
    $.each(laws, function(i, law) {
        law.publishDate = new Date(law.published);
        minYear = Math.min(minYear, law.publishDate.getFullYear());
        maxYear = Math.max(maxYear, law.publishDate.getFullYear());
    });

    // init raphael canvas
    var paper = Raphael("vis-modification-times", "100%", "550");

    // draw grid circles and labels for some reference years
    var minYearRound = Math.round(minYear/10)*10, maxYearRound = Math.round(maxYear/10)*10;
    for (var yr= maxYearRound; yr>= minYearRound; yr-=10) {
        var
        rad = year2rad(yr);
        phi = date2angle(new Date(2000, 0, 15)),
        x = cx + Math.cos(phi) * (rad+8),
        y = cy + Math.sin(phi) * (rad+8);
        var circ = paper.circle(cx, cy, rad).attr(gridCircAttr);
        if (yr == maxYearRound) circ.attr({ fill: '#fff', 'fill-opacity': 0.75});
        if (yr == minYearRound) circ.attr({ fill: '#f5f5f5'});
        paper.text(cx, cy - rad + 8, yr).attr(gridCircLabelAttr).rotate(15, cx, cy);
    }

    // draw radial lines and labels for each month
    months = 'Jan,Feb,Mär,Apr,Mai,Jun,Jul,Aug,Sept,Okt,Nov,Dez'.split(',');
    $.each([0,1,2,3,4,5,6,7,8,9,10,11], function(m) {
        var date = new Date(2000, m, 1),
            phi = date2angle(date),
            x0 = cx + Math.cos(phi) * year2rad(minYearRound),
            y0 = cy + Math.sin(phi) * year2rad(minYearRound),
            x1 = cx + Math.cos(phi) * year2rad(maxYearRound),
            y1 = cy + Math.sin(phi) * year2rad(maxYearRound);

        paper.path(['M',x0,y0,'L',x1,y1]).attr(gridCircAttr);

        phi = date2angle(new Date(2000, m, 15));
        x1 = cx + Math.cos(phi) * year2rad(maxYearRound+4),
        y1 = cy + Math.sin(phi) * year2rad(maxYearRound+4);


        paper.text(x1, y1, months[m]).attr(monthLabelAttr);
    });

    // summer and winter breaks
    function donutPiePathStr(minRad, maxRad, a0, a) {
        var x0 = cx+Math.cos(a0)*minRad,
            y0 = cy+Math.sin(a0)*minRad,
            x1 = cx+Math.cos(a0+a)*minRad,
            y1 = cy+Math.sin(a0+a)*minRad,
            x2 = cx+Math.cos(a0+a)*maxRad,
            y2 = cy+Math.sin(a0+a)*maxRad,
            x3 = cx+Math.cos(a0)*maxRad,
            y3 = cy+Math.sin(a0)*maxRad;
        return "M"+x0+" "+y0+" A"+minRad+","+minRad+" 0 0,1 "+x1+","+y1+" L"+x2+" "+y2+" A"+maxRad+","+maxRad+" 0 0,0 "+x3+" "+y3+" Z";
    }
    function donutPie(minPhi, phiDelta) {
        return paper.path(donutPiePathStr(year2rad(minYearRound), year2rad(maxYearRound), minPhi, phiDelta));
    }
    var d0 = new Date(2000,11,23), d1 = new Date(2000,0,20), d2 = new Date(2000,6,1), d3 = new Date(2000,8,1);
    donutPie(date2angle(d0), (date2angle(d1)+Math.PI*2)-date2angle(d0)).attr(winterBreakAttr);
    donutPie(date2angle(d2), date2angle(d3)-date2angle(d2)).attr(summerBreakAttr);

    // draw laws
    $.each(laws, function(i, law) {
        var pt = law2xy(law);
        paper.circle(pt[0], pt[1], 4).attr(lawDotAttr);
    });

}
