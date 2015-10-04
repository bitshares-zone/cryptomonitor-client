$(document).ready(function() {
	// Current time (in footer)
	setInterval(function(){
		$('#current_time').html((new Date).toLocaleString());
	}, 1000);

	setInterval(function() {
	   $('#advertisment').children().remove();

	  var rand = Math.floor((Math.random()*100)+1);
	   $('#advertisment').html("<iframe id='a07de74d' name='a07de74d' src='http://bitminr.de/ads/revive-adserver-3.0.4/www/delivery/afr.php?zoneid=1&amp;cb=" + rand + "' frameborder='0' scrolling='no' width='160' height='600'><a href='http://bitminr.de/ads/revive-adserver-3.0.4/www/delivery/ck.php?n=ac686a4d&amp;cb=" + rand + "' target='_blank'><img src='http://bitminr.de/ads/revive-adserver-3.0.4/www/delivery/avw.php?zoneid=1&amp;cb=" + rand + "&amp;n=ac686a4d' border='0' alt='' /></a></iframe>");
	}, 30000);

	$("#history").mCustomScrollbar({
        updateOnContentResize: true,
        autoHideScrollbar: true,
		theme:"light-thin"
	});


	Highcharts.setOptions({
	    global: {
	        useUTC: false
	    }
	});

	// Main div height
	$(window).resize(function() {
		var h = $(window).height();
		var w = $(window).width();

		$('#main').css('height', (h - 88) + 'px');

		$('#charts').css('height', (h-88) + 'px');
		$('#charts').css('width', (w - 452) + 'px' );

		$('#candle_chart').css('height', (h-90) + 'px');
		$('#candle_chart').css('width', (w - 452) + 'px');
		$('#candle_chart').empty();

		$('#right_box').css('height', (h-88) + 'px');

		$('#orderbook').css('height', ((h-90)*0.6) + 'px');

		$('#orders_ask').css('height', ($('#orderbook').height()-20)/2 + 'px');
		$('#orders_bid').css('height', ($('#orderbook').height()-20)/2 + 'px');

		$('#orders_ask .wrapper')
			.css('height', ($('#orderbook').height()-20)/2 + 'px')
			.css('width', ($('#orders_ask').width()+20) + 'px');
		$('#orders_bid .wrapper')
			.css('height', ($('#orderbook').height()-20)/2 + 'px')
			.css('width', ($('#orders_bid').width()+20) + 'px');

		$('#history_outer').css('height', ((h-100)*0.6) + 'px');
		$('#history').css('height', (((h-100)*0.4) - 10)  + 'px');

		//$('#advertisment').css('width', '280px');
		var space_height = $('#main').height() - 560;
		if (space_height < 0)
			space_height = 0;
		$('#advertisment .space').css('height', space_height + 'px');
	});
	$(window).resize();


	var other_coins = [];

	var market;// = "cryptsy_meow_btc";
	var interval = 15;
	var chart_type = "candlestick";
	var ma_first = 0;
	var ma_second = 0;

	var chart_data;
	var last_price = 0;
	var tickers = [];

	if(getCookie('settings') != null) {
		var settings = JSON.parse(getCookie('settings'));

		market = settings.market;
		interval = parseInt(settings.interval);

		if(settings.chart_type !== undefined && settings.chart_type !== null)
			chart_type = settings.chart_type;

		if(settings.ma_first !== undefined && settings.ma_first !== null)
			ma_first = settings.ma_first;

		if(settings.ma_second !== undefined && settings.ma_second !== null)
			ma_second = settings.ma_second;


		$('.chart_type').removeClass('current');
		$('.chart_type a[type="' + chart_type + '"]').parent().addClass('current');

		$('.period').removeClass('current');
		$('.period a[interval="' + interval + '"]').parent().addClass('current');

		$('.ticker').removeClass('current');
		$('.ticker a[market="' + market + '"]').parent().addClass('current');

		//$('.currency').removeClass('hidden');
		//$('.currency[currency="' + currency + '"]').addClass('hidden');

		//$('.currency_selected').html($('.currency[currency="' + currency + '"] a').html());

		$('.indicator_interval_first[bars="' + ma_first + '"]').addClass('current');
		$('.indicator_interval_second[bars="' + ma_second + '"]').addClass('current');
		if(ma_first > 0 || ma_second > 0)
			$('.indicator_ma').addClass('current');
	}

	var socket = io.connect('http://bitshares-zone.com:3000/');

  	socket.on('connect', function () {
	    $('#info').html("Connected to server.");

	    socket.on('markets', function(markets) {
	    	var selected = false;
	    	for(i in markets) {
	    		var m = markets[i];

	    		if(m.base.toLowerCase() == currency.toLowerCase()) {
	    			$('.nav').append('<li class="ticker" id="' + m.id + '"><a href="#">' + m.name + ' ' + m.alt + '</a><br /><span class="g">' + parseFloat(m.price).toFixed(8) + ' ' + m.alt + '</span></li>');
	    			if(m.id == market) {
	    				$('.ticker[id="' + market + '"]').addClass('current');

	    				socket.emit('set market', market);
	    				socket.emit('set interval', interval);
	    				selected = true;
	    			}
	    		}
    			else {
    				if(other_coins.indexOf(m.base.toLowerCase()) == -1) {
    					other_coins.push(m.base.toLowerCase());

    					$('.currency_selector ul').append('<li class="currency"><a href="http://' + m.base.toLowerCase() + '.CoinMonitor.de">' + m.base.toUpperCase() + '.CoinMonitor.de</a></li>');
    				}
    			}
	    	}
	    	if(!selected) {
	    		market = $('.nav .ticker:eq(0)').attr('id');
	    		$('.ticker[id="' + market + '"]').addClass('current');

    			socket.emit('set market', market);
    			socket.emit('set interval', interval);
	    	}

			$('.ticker').click(function() {
				market = $(this).attr('id');

				$('.ticker').removeClass('current');
				$(this).addClass('current');

				socket.emit('set market', market);

				setSettings();

				if(candle_chart != false)
					candle_chart.destroy();
			});
	    });

		socket.on('new trade', function(trade) {
			var date = new Date(Date.parse(trade.date));
			var quantity = formatQuantity(trade.baseTraded, 12);

			if(last_price > trade.price)
				var color = "r";
			else if(last_price < trade.price)
				var color = "g";

			last_price = trade.price;

			$('#history .mCSB_container').prepend('<div class="row" style=""><div class="t">' + date.toLocaleTimeString() + '</div><div class="p ' + color + '">' + trade.price.toFixed(8) + '</div><div class="q">' + quantity + '</div></div>');
			$('#history .row:eq(0)')
				.animate({
					height: 12
				}, 1000)
				.css('backgroundColor', '#2A2A2A')
				.animate({
					backgroundColor: "#0A0A0A"
				}, 2000)
			$("#history").mCustomScrollbar("update");
		});

		socket.on('sell orders', function(orders) {
			$('#orders_ask .row').remove();
			for(i in orders) {
				var q = orders[i];

				$('#orders_ask .wrapper').append('<div class="row" type="sell" price="' + i + '"><div class="p">' + i + '</div><div class="q">' + formatQuantity(q, 13) + '</div></div>');
			}
		});

		socket.on('buy orders', function(orders) {
			var count = 0;
			$('#orders_bid .row').remove();
			for(i in orders) {
				++count;
				var q = orders[i];

				$('#orders_bid .wrapper').append('<div class="row" type="buy" price="' + i + '"><div class="p">' + i + '</div><div class="q">' + formatQuantity(q, 13) + '</div></div>');
			}
			var p = Math.floor(($('#orders_ask').height() - (count * 11)) / 11);
			for(i=0;i<p;++i) {
				$('#orders_bid .wrapper').prepend('<div class="row"><div class="p">&nbsp;</div><div class="q">&nbsp;</div></div>');
			}

			$('#orders_bid .wrapper').scrollTop($("#orders_bid .wrapper")[0].scrollHeight);
		});

		socket.on('market depth change', function(data) {
			if (data.change == 'increase') {
				$('.row[type="' + data.type + '"][price="' + data.price + '"] .q')
					.html(formatQuantity(data.quantity, 13))
					.css('color', '#6C6')
					.css('backgroundColor', '#2A2A2A')
					.animate({
      					color: "#999",
      					backgroundColor: '#0A0A0A'
  					}, 4000);
			}
			if (data.change == 'decrease') {
				$('.row[type="' + data.type + '"][price="' + data.price + '"] .q')
					.html(formatQuantity(data.quantity, 13))
					.css('color', '#C66')
					.css('backgroundColor', '#2A2A2A')
					.animate({
      					color: "#999",
      					backgroundColor: '#0A0A0A'
  					}, 4000);
			}
			if (data.change == "close") {
				$('.row[type="' + data.type + '"][price="' + data.price + '"]').remove();
			}

			if (data.change == "open") {
				var last_row = false;
				$('.row[type="' + data.type + '"]').each(function() {
					if($(this).attr('price') < data.price)
						last_row = $(this);
				});

				if (last_row == false) {
					if (data.type == "buy")
						$('.orders_bid .wrapper').append('<div class="row" type="buy" price="' + data.price + '" style="display: none;"><div class="p">' + data.price + '</div><div class="q">' + formatQuantity(data.quantity, 13) + '</div></div>');
					else
						$('.orders_ask .wrapper').prepend('<div class="row" type="sell" price="' + data.price + '" style="display: none;"><div class="p">' + data.price + '</div><div class="q">' + formatQuantity(data.quantity, 13) + '</div></div>');
				} else {
					if (data.type == "buy")
						last_row.after('<div class="row" type="buy" price="' + data.price + '" style="display: none;"><div class="p">' + data.price + '</div><div class="q">' + formatQuantity(data.quantity, 12) + '</div></div>');
					else
						last_row.after('<div class="row" type="sell" price="' + data.price + '" style="display: none;"><div class="p">' + data.price + '</div><div class="q">' + formatQuantity(data.quantity, 12) + '</div></div>');
				}

				$('.row[type="' + data.type + '"][price="' + data.price + '"]').show();
			}
		});

		socket.on('ticker', function(data) {
			var el = $('.ticker[id="' + data.id + '"] > span');

			if (tickers[data.id] > data.price) {
				el.removeClass();
				el.addClass('r');
				el.html('&darr; ' + data.price + ' ' + data.alt);
			} else if (tickers[data.id] < data.price) {
				el.removeClass();
				el.addClass('g');
				el.html('&uarr; ' + data.price + ' ' + data.alt);
			} else if (tickers[data.id] === undefined) {
				el.removeClass();
				el.addClass('g');
				el.html(data.price + ' BTC');
			}
		});

		socket.on('chart', function(data) {
			chart_data = data;
			generateChart();
		});

		socket.on('new candle', function(data) {
			var date = Date.parse(data.candle[0]);

			var d_ohlc = [
				date, // date
				data.candle[1], // open
				data.candle[2], // high
				data.candle[3], // low
				data.candle[4] // close
			];
			var d_volume = [
				date, // date
				data.candle[5] // volume
			];
			var d_close = [
				date,
				data.candle[4]
			];

			var chart_num = 1;
			if(ma_first > 0) {
				var price = data.candle[4];

				for(i=chart_data.length-ma_first; i<chart_data.length-1; ++i) {
					price += chart_data[i][4];
				}
				var value = (price / ma_first).toFixed(8);

				candle_chart.series[chart_num].addPoint([date, value]);
				chart_num += 1;
			}
			if(ma_second > 0) {
				var price = data.candle[4];

				for(i=chart_data.length-ma_second; i<chart_data.length-1; ++i) {
					price += chart_data[i][4];
				}
				var value = (price / ma_first).toFixed(8);

				candle_chart.series[chart_num].addPoint([date, value]);
				chart_num += 1;
			}

			candle_chart.series[chart_num].addPoint(d_volume);

			if(chart_type == "spline") {
				candle_chart.series[0].addPoint(d_close);
			}
			else
				candle_chart.series[0].addPoint(d_ohlc);

			chart_data.push(d_ohlc);
		});

		function generateChart() {
			var data = chart_data;

			var ohlc = [],
				volume = [],
				close = [],
				dataLength = data.length;
			
			var ma = [];
			var count=0;
			var price=0;

			var ma2 = [];
			var count2=0;
			var price2=0;

			for (i = 0; i < dataLength; i++) {
				var date = Date.parse(data[i][0]);

				if (chart_type == "ohlc" || chart_type == "candlestick") {
					ohlc.push([
						date, // date
						data[i][1], // open
						data[i][2], // high
						data[i][3], // low
						data[i][4] // close
					]);
				}
				
				volume.push([
					date, // date
					data[i][5] // volume
				]);

				if (chart_type == "spline") {
					close.push([
						date,
						data[i][4]
					]);
				}

				if(ma_first > 0) {
					price += data[i][4];
					if(count < ma_first)
						++count;
					else
						price -= data[i-count][4];

					var value = price / count;
					ma.push([
						date,
						value
					]);
				}

				if(ma_second > 0) {
					price2 += data[i][4];
					if(count2 < ma_second)
						++count2;
					else
						price2 -= data[i-count2][4];

					var value2 = price2 / count2;
					ma2.push([
						date,
						value2
					]);
				}
			}

			var h1 = ($('#candle_chart').height() - 100) * 0.8;
			var h2 = ($('#candle_chart').height() - 100) * 0.2;

		   	var volume = {
		        type: 'column',
		        data: volume,
		        name: 'Volume',
		        yAxis: 1
		   	};
		   	var chart = {};

		   	var series = [];

		   	if (chart_type == "spline") {
		   		var chart = {
			        type: 'spline',
			        data: close,
			        name: 'Line',
			        color: "#CCCC00"
			    }
			    series[series.length] = chart;
		   	} else {
		   		var chart = {
			        type: chart_type,
			        data: ohlc,
			        name: 'OHLC'
			    }
			    series[series.length] = chart;
		   	}

		   	if(ma_first > 0) {
				var ma = {
					type: 'line',
					data: ma,
					name: "MA",
					color: "#89A9BA",
				}
			    series[series.length] = ma;
			}

			if(ma_second) {
				var ma2 = {
					type: 'line',
					data: ma2,
					name: "MA2",
					color: '#926F42'
				}
			    series[series.length] = ma2;
			}

		    series[series.length] = volume;

			candle_chart = new Highcharts.StockChart({
			    rangeSelector: { enabled: false },
			    scrollbar: { enabled: false },
				navigation: { enabled: false },
				credits: { enabled: false },

				chart: {
					renderTo: "candle_chart",
			     	backgroundColor: "#0A0A0A",
			      	borderWidth: 0,
			      	borderRadius: 0,
			      	plotBackgroundColor: null,
			      	plotShadow: false,
			      	plotBorderWidth: 0
			   	},
			   	global: {
					useUTC: true
				},

			   	plotOptions: {
			   		candlestick: {
			   			color: '#990f0f',
			    		lineColor: '#cc1414',
			    		upLineColor: '#49c043',
			    		upColor: '#0A0A0A',
			    		dataGrouping: {
			    			enabled: false
			    		}
			    	},
			    	ohlc: {
			    		dataGrouping: {
			    			enabled: false
			    		}
			    	},
			    	line: {
			    		allowPointSelect: false,
			    		dataGrouping: {
			    			enabled: false
			    		},
			    		lineWidth: 1,
			    		marker: {
			    			enabled: false
			    		},
			    		states: {
			    			hover: {
			    				enabled: false
			    			}
			    		}
			    	},
			    	spline: {
			    		allowPointSelect: false,
			    		dataGrouping: {
			    			enabled: false
			    		},
			    		marker: {
			    			enabled: false
			    		},
			    		states: {
			    			hover: {
			    				enabled: false
			    			}
			    		}
			    	},
			    	column: {
			    		color: "#7798BF",
			    		dataGrouping: {
			    			enabled: false
			    		}
			    	}
			   	},

				xAxis: {
					gridLineWidth: 0,
					lineColor: '#999',
					tickColor: '#999',
					labels: {
						style: {
							color: '#666',
							font: 'bold 11px Consolas, monospace'
						}
					},
					title: {
						style: {
							color: '#666',
							font: 'bold 11px Consolas, monospace'
						}
					},
					range: interval * 3600 * 2000
				},
			    yAxis: [
			    	{
				        height: h1,
				        lineWidth: 2,
				        offset: 65,
				        alternateGridColor: null,
						minorTickInterval: null,
						gridLineColor: 'rgba(255, 255, 255, .1)',
						minorGridLineColor: 'rgba(255,255,255,0.07)',
						lineWidth: 0,
						tickWidth: 0,
						labels: {
							style: {
								color: '#666',
								font: 'bold 11px Consolas, monospace'
							},
							formatter: function() {
								return Highcharts.numberFormat(this.value, 8);
							},
							y: 4
						},
						title: {
							style: {
								color: '#666',
								font: 'bold 11px Consolas, monospace'
							}
						}
			    	}, {
				        top: h1+10,
				        height: h2,
				        offset: 25,
				        lineWidth: 2,
				        alternateGridColor: null,
						minorTickInterval: null,
						gridLineColor: 'rgba(255, 255, 255, .1)',
						minorGridLineColor: 'rgba(255,255,255, 0.07)',
						lineWidth: 0,
						tickWidth: 0,
						labels: {
							style: {
								color: '#666',
								font: 'bold 11px Consolas, monospace'
							},
							float: 'right',
							y: 4
						},
						title: {
			            	text: 'Volume',
							style: {
								color: '#666',
								font: 'bold 11px Consolas, monospace'
							}
						}
			    	}
			    ],
				tooltip: {
			      	backgroundColor: "#0A0A0A",
			      	borderWidth: 0,
			    	borderRadius: 0,
			    	//headerFormat: '{point.key} ',
			    	//pointFormat: ' | <span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b>',
			    	positioner: function () {
			    		return { x: 10, y: 0 };
			    	},
			    	shadow: false,
			      	style: {
		         		color: '#999999',
		         		fontSize: '10px'
		      		},
		      		valueDecimals: 8,
		      		formatter: function() {
						var s = Highcharts.dateFormat('%b %e, %H:%M', this.x);

						$.each(this.points, function(i, p){
							if (p.series.name == 'OHLC')
								s += ', <strong>Open:</strong> ' + Highcharts.numberFormat(p.point.open, 8) + 
								', <strong>High:</strong> ' + Highcharts.numberFormat(p.point.high, 8) + 
								', <strong>Low:</strong> ' + Highcharts.numberFormat(p.point.low, 8) + 
								', <strong>Close:</strong> ' + Highcharts.numberFormat(p.point.close, 8);
							else if (p.series.name == "Line")
								s += '<strong>Close:</strong> ' + Highcharts.numberFormat(p.y, 8);
							else if (p.series.name == "MA")
								s += ', <strong>MA (' + ma_first + ' bars):</strong> ' + Highcharts.numberFormat(p.y, 8);
							else if (p.series.name == "MA2")
								s += ', <strong>MA (' + ma_second + ' bars):</strong> ' + Highcharts.numberFormat(p.y, 8);
							else
								s += ', <strong>Volume:</strong> ' + Highcharts.numberFormat(p.y, 8) + ' ' + currency.toUpperCase();
						});

						return s;
					}
			   	},
			   	inputStyle: {
		     		backgroundColor: '#333',
		     		color: '#FFF'
		  		},
		  		navigator: {
			      	handles: {
			         	backgroundColor: '#666',
			         	borderColor: '#AAA'
			      	},
			      	outlineColor: 'transparent',
					maskFill: 'rgba(16, 16, 16, 0.5)',
			      	series: {
			         	color: 'transparent',
			         	lineColor: '#A6C7ED'
			      	}
			   	},

			    series: series
			});
		}

		function setSettings() {
			settings = {
				market: market,
				interval: interval,
				chart_type: chart_type,
				ma_first: ma_first,
				ma_second: ma_second
			};

			setCookie('settings', JSON.stringify(settings), 365);
		}

		$('.period a').click(function() {
			interval = $(this).attr('interval');

			$('.period').removeClass('current');
			$(this).parent().addClass('current');

	   		socket.emit('set interval', interval);
			setSettings();

			if(candle_chart != false)
				candle_chart.destroy();
		});

		$('.chart_type a').click(function() {
			chart_type = $(this).attr('type');

			$('.chart_type').removeClass('current');
			$(this).parent().addClass('current');
			
			if(candle_chart != false)
				candle_chart.destroy();

			generateChart();
			setSettings();
		});

		$('.indicator_interval_first').click(function() {
			ma_first = $(this).attr('bars');

			$('.indicator_interval_first').removeClass('current');
			$(this).addClass('current');

			if (ma_first == 0 && ma_second == 0)
				$('.indicator_ma').removeClass('current');
			else
				$('.indicator_ma').addClass('current');

			if(candle_chart != false)
				candle_chart.destroy();

			generateChart();
			setSettings();
		});

		$('.indicator_interval_second').click(function() {
			ma_second = $(this).attr('bars');

			$('.indicator_interval_second').removeClass('current');
			$(this).addClass('current');

			if (ma_first == 0 && ma_second == 0)
				$('.indicator_ma').removeClass('current');
			else
				$('.indicator_ma').addClass('current');
			
			if(candle_chart != false)
				candle_chart.destroy(); 

			generateChart();
			setSettings();
		});
  	});

	socket.on('reconnecting', function() {
	    $('#info').html("Reconnecting to server.");
	});
	socket.on('connecting', function() {
	    $('#info').html("Connecting to server.");
	});
	socket.on('disconnect', function() {
	    $('#info').html("Connection lost.");

		$("#history .row").remove();
		$('#orders_ask .row').remove();
		$('#orders_bid .row').remove();
		$("#history").mCustomScrollbar("update");
		$('.ticker').remove();

		if(candle_chart != false)
			candle_chart.destroy();
	});
	socket.on('connect_failed', function() {
	    $('#info').html("Connection failed.");
	});
});

function formatQuantity(quantity, length) {
	var total_part = Math.floor(quantity);
	var fraction_part = String(quantity-total_part).substring(2).substring(0,8);

	var s = String(total_part);
	var temp = "";
	var x = 0;
	for(i=s.length-1;i>=0;--i) {
		++x;
		temp = s[i] + temp;

		if (x%3 == 0 && i!=0)
			temp = "," + temp;
	}
	total_part = temp;

	var total_length = String(total_part).length;
	var add = length-total_length;

	var string = "";
	for(i=1;i<=add;++i)
		string += "&nbsp;";

	string += total_part;

	if(fraction_part)
		string += "<span>" + "." + fraction_part + "</span>";

	return string;
}



function setCookie(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

function getCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

function eraseCookie(name) {
	createCookie(name,"",-1);
}
