/*
 * visualisation of differences
 *
 *  By Gregor Aisch (https://driven-by-data.net/)
 *
 * Released under the GPL v3 license.
 * deps: jquery, raphaeljs
 *
 */



function visualiseDiffs(laws, start_year = 1800, end_year = 2023 ,step = 1) {

	function getEveryNth(arr, step) {
		var res = arr.filter((e, i) => i % step === step - 1)
		if ( (arr.length+1) % step != 0)
			res.push(arr.pop())
		return  res;
	}
	
	function getLawByYear(law,start_year, end_year) {
		var year = law.published.split("-")[0]
		return  ((start_year <= year)&& (year <= end_year));
	}
	
	laws = laws.filter( law =>  getLawByYear(law,start_year,end_year));
	laws = getEveryNth(laws, step);

    var $cont = $('#vis-diff-html'),
		//width = $('#vis-diff').width(),
        colw = 60, //width / laws.length,
		width = colw * laws.length;
        sect_offset = 10;
	
	if(width < $('#vis-diff').width()) {
		width = $('#vis-diff').width();
		colw = width/ laws.length;
	} else {
		var left = (-($( document ).width() - $('#vis-diff').width())/4)
		$('#vis-diff-html').css("left", left);
		$('#vis-diff-svg').css("left", left);
	}

    // init raphael canvas
    var paper = Raphael("vis-diff-svg", width,3000),
        lineAttr = { 'stroke-width': 0.5, stroke: '#777' };

    var all_article_divs = [];

    function fix_y(y) {
        return Math.round(y)+0.5;
    }

    function lines2height(lines) {
        return Math.round(Math.max(lines*0.6+2,5));
    }

    function artNo(title) {
		var no = title.split(' ')[1];
        return no.length == 1 ? '0'+no : no;
        //var no = title.substr(2, title.indexOf(' ', 2)-1).trim();
        //return no.length == 1 ? '0'+no : no;
    }

    var _arts = {}, _titles = [];
	


    // parse dates
    $.each(laws, function(i, law) {
        law.publishDate = new Date(law.published);
        var left = Math.round(i * colw)+10, laww = 30, right = left + laww, top = 40, sect = 1;

        var $law = $('<div class="law nolegend" />'),
            $label = $('<label>'+law.publishDate.getFullYear()+'</label>');
        if ("link" in law) 
             $label = $('<label><a href="' +  law.link+'">'+law.publishDate.getFullYear()+'</a></label>');
        $law.append($label);
        $law.css({ width: colw+'px', left: left+'px' });

        $cont.append($law);

        var article_divs = {}, law_h = 0;

        $.each(law.articles, function(j, article) {
            var lines = 0, art_h;
            $.each(article.paragraphs, function(k, paragraph) {
                lines += Math.round(paragraph.content_length/100);
            });
            article.lines = lines;
            art_h = lines2height(lines);
            law_h += art_h+1;

            if (article.section > sect) {
                sect = article.section;
                law_h += sect_offset;
            }
        });

        sect = 1;
        var offset = 50 //Math.round((150 - law_h) * 0.5);

        $label.css({ top: (15+offset)+'px' });
        top += offset;

        $.each(law.articles, function(j, article) {
            var content = '<ul class="unstyled">';
            $.each(article.paragraphs, function(k, paragraph) {
                content += '<li>'+paragraph.content.replace('\n', '<br />')+'</li>';
            });
            content += '</ul>';

            var art_h = lines2height(article.lines);
            $article = $('<div class="article" />');
            $article.data('id', article.id);
            $article.data('version', moment(law.publishDate).format('LL'));
            $article.data('top', top);
            $article.data('bottom', top+art_h);
            $article.attr('title', article.title);
            $article.data('title', article.title);
            $article.data('content', _.str.truncate(content, 1500));
            $article.data('full_content', content);
            //$article.data('no', artNo(article.title));
            //console.log(article.title, artNo(article.title));
			$article.data('no', article.no);
            //console.log(article.title, artNo(article.title));

            $article.click(function(evt) {
                var art = $(evt.target), modal = $('#modal-law-display');
                $('h3', modal).html(art.data('title'));
                var full = art.data('full_content'),
                    diff = art.data('full_diff');
                $('.modal-body .current', modal).html(full);
                if (diff) $('.modal-body .diff', modal).html(diff);
                else $('.modal-body .diff', modal).html(full);
                $('.version', modal).html(art.data('version'));

                modal.modal('show');
            });

            $article.css({ height: art_h+'px', top: top+'px' });
            top += art_h+1;

            if (article.section > sect) {
                sect = article.section;
                top += sect_offset;
            }

            $law.append($article);
            article_divs[article.id] = $article;

            // draw connection lines to last
            if (i > 0) {
                if (article.status == 'new' || !all_article_divs[i-1][article.id]) {
                    $article.addClass('new');
                } else if (article.status == 'deleted') {
                    $article.addClass('deleted');
                }

                if (article.status != 'new' && all_article_divs[i-1][article.id]) {
                    // article already exists
                    var last_version = all_article_divs[i-1][article.id],
                        x0 = left - colw + laww,
                        y0t = fix_y(last_version.data('top')),
                        y0b = fix_y(last_version.data('bottom')),
                        x1 = left+1,
                        y1t = fix_y($article.data('top')),
                        y1b = fix_y($article.data('bottom'));

                    var straight = ['M',x0,fix_y((y0b+y0t)*0.5),'L',x1,fix_y((y1b+y1t)*0.5)],
                        curved = ['M',x0,fix_y((y0b+y0t)*0.5),'C',(x0+x1)*0.5,fix_y((y0b+y0t)*0.5),(x0+x1)*0.5,fix_y((y1b+y1t)*0.5),x1,fix_y((y1b+y1t)*0.5)],
                        curved2 = ['M',x0,fix_y((y0b+y0t)*0.5),'C',x0+(x1-x0)*0.4,fix_y((y0b+y0t)*0.5),x0+(x1-x0)*0.6,fix_y((y1b+y1t)*0.5),x1,fix_y((y1b+y1t)*0.5)];
                    paper.path(curved2).attr(lineAttr);
                    // paper.path(['M',x0,y0t,'L',x1,y1t]).attr(lineAttr);

                    // check for diffs
                    var ver1 = $article.data('full_content'),
                        ver0 = last_version.data('full_content');

                    if (ver0 == ver1) {
                        $article.addClass('nochange');
                    } else {
                        $v0 = $('li', $(ver0));
                        $v1 = $('li', $(ver1));
                        var k, l, K = $v0.length, L = $v1.length, par0, par1, $ul, $ul2;
                        if (K == L) {
                            $ul = $('<ul />');
                            $ul2 = $('<ul />');
                            for (k=0; k < K; k++) {
                                par0 = $($v0[k]).html();
                                par1 = $($v1[k]).html();
                                if (par0 == par1) {
                                    $ul.append('<li>'+_.str.truncate(par0, 40)+'</li>');
                                    $ul2.append('<li>'+par0+'</li>');
                                } else {
                                    var diff = diffString(par0, par1),
                                        inspos = diff.indexOf('<del>'),
                                        shortDiff;
                                    if (diff.length < 200) shortDiff = diff;
                                    else {
                                        if (inspos < 0) inspos = diff.indexOf('<ins>');
                                        if (inspos < 0) shortDiff = _.str.truncate(diff, 40);
                                        else {
                                            if (inspos < 100) shortDiff = _.str.truncate(diff, diff.indexOf('</')+200);
                                            else shortDiff = _.str.truncate(diff, 40)+' '+diff.substr(inspos-20, diff.indexOf('</')-inspos+300);
                                        }
                                    }
                                    $ul.append('<li>'+shortDiff+'</li>');
                                    $ul2.append('<li>'+diff+'</li>');
                                }
                            }
                            $article.data('content', '<ul class="unstyled">'+$ul.html()+'</ul>');
                            $article.data('full_diff', '<ul class="unstyled">'+$ul2.html()+'</ul>');
                        } else {
                            par0 = '';
                            par1 = '';
                            $.each($v0, function(k, li) {
                                par0 += $(li).html()+'\n\n\n';
                            });
                            $.each($v1, function(k, li) {
                                par1 += $(li).html()+'\n\n\n';
                            });
                            par0 = diffString(par0, par1);
                            $ul = $('<ul />');
                            $ul2 = $('<ul />');
                            $.each(par0.split('\n\n\n'), function(k, txt) {
                                if (txt.indexOf('<del>') > -1 || txt.indexOf('<ins>') > -1) {
                                    $ul.append('<li>'+txt+'</li>');
                                    $ul2.append('<li>'+txt+'</li>');
                                } else {
                                    $ul.append('<li>'+_.str.truncate(txt,40)+'</li>');
                                    $ul2.append('<li>'+txt+'</li>');

                                }
                            });
                            $article.addClass(L > K ? 'par-added' : 'par-removed');
                            $article.data('content', '<ul class="unstyled">'+$ul.html()+'</ul>');
                            $article.data('full_diff', '<ul class="unstyled">'+$ul2.html()+'</ul>');
                        }
                        //
                    }
                }
            }

            //var no = artNo(article.title);
			var no = article.no;
            if (!_arts[no]) {
                _arts[no] = article.title;
                _titles.push(no);
            }
        });

        all_article_divs.push(article_divs);
    });

    var updateFilterTimer;

    function updateFilterRelax() {
        clearTimeout(updateFilterTimer);
        updateFilterTimer = setTimeout(updateFilter, 100);
    }

    function updateFilter(elt) {
        var q = $('#search').val(), terms = q.trim().toLowerCase().split(' '),
            title = $('#parasel').val();
        $('.article').each(function(i, el) {
            var art = $(el), visible = true;
            if (!art.data('full_content')) return;
            $.each(terms, function(i, term) {
                visible = visible && art.data('full_content').toLowerCase().indexOf(term) >= 0;
                if (!visible) return false;
            });
            if (title[0] == 'A') {
                visible = visible && artNo(title) == art.data('no');
            }
			if (elt) {
				visible = visible && artNo(elt.getAttribute("data-original-title").replace("-",".")) == art.data('no');
			}
            if (!visible) art.addClass('hidden');
            else art.removeClass('hidden');
        });
    }
    var parsel = $('#parasel');
    _titles.sort( function(a, b)  {return (parseInt(a) - parseInt(b))});
    $.each(_titles, function(i, no) {
        parsel.append('<option>'+_arts[no]+'</option>');
    });

    $('#parasel').change(updateFilter);
    $('#parasel').keyup(updateFilter);

    updateFilter();

    $('#search').keyup(updateFilterRelax);


    //$('.article').popover({ placement: function(e, f) { return $(f).parent().offset().left > 600 ? 'left': 'right'; } });
    $('.article').popover({ placement: 'right'});
	$('.article').mouseover(function(e) { updateFilter(e.target); });
	$('.article').mouseout(function() { updateFilter(); })
    $('.article').click(function(e) { $(e.target).popover('show');  });

}
