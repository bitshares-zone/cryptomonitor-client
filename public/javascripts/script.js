$(document).ready(function() {
	// Current time (in footer)
	setInterval(function(){
		$('#current_time').html((new Date).toLocaleString());
	},1000);

	$("#history").mCustomScrollbar({
        updateOnContentResize: true,
        autoHideScrollbar:true,
		theme:"light-thin"
	});
	$('#orders_ask').mCustomScrollbar({
        updateOnContentResize: true,
        autoHideScrollbar:true,
		theme:"light-thin"
	});
	$('#orders_bid').mCustomScrollbar({
        updateOnContentResize: true,
        autoHideScrollbar:true,
		theme:"light-thin"
	});


	Highcharts.setOptions({
	    global: {
	        useUTC: false
	    }
	});

	var market = "cryptsy";
	var interval = 15;
	var chart_type = "candlestick";
	//var currency = "usd";

	var ma_first = 0;
	var ma_second = 0;

	if(getCookie('settings') != null) {
		var settings = JSON.parse(getCookie('settings'));

		market = settings.market;
		interval = parseInt(settings.interval);

		if(settings.chart_type !== undefined && settings.chart_type !== null)
			chart_type = settings.chart_type;

		if(settings.currency !== undefined && settings.currency !== null)
			currency = settings.currency;

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

	var candle_chart = false;
	var ticker = false;
	var time_chart = 0;
	var time_last = 0;
	var last_tickers = {};
	var last_trade_price = 0;
	// var currencies;
	var current_price = 0;

	$('.period a').click(function() {
		interval = $(this).attr('interval');

		$('.period').removeClass('current');
		$(this).parent().addClass('current');

		generateChart();
		setSettings();
	});

	$('.ticker a').click(function() {
		market = $(this).attr('market');

		$('.ticker').removeClass('current');
		$(this).parent().addClass('current');

		$("#history .row").remove();
		$('#orders_ask .row').remove();
		$('#orders_bid .row').remove();
		$("#history").mCustomScrollbar("update");
		last_trade_price = 0;
		time_last = 0;

		generateChart();
		setSettings();
	});

	$('.chart_type a').click(function() {
		chart_type = $(this).attr('type');

		$('.chart_type').removeClass('current');
		$(this).parent().addClass('current');

		generateChart();
		setSettings();
	});

	// $('.currency a').click(function() {
	// 	currency = $(this).parent().attr('currency');

	// 	$('.currency').removeClass('hidden');
	// 	$(this).parent().addClass('hidden');

	// 	$('.currency_selected').html($(this).html());

	// 	var kdoge = current_price*1000;
		
	// 	for(cur in currencies) {
	// 		if(cur == currency) {
	// 			var value = Math.round(kdoge*currencies[cur] * 1000)/1000;
	// 			$('.currency_value').html(value);

	// 			break;
	// 		}
	// 	}

	// 	setSettings();
	// });

	$('.indicator_interval_first').click(function() {
		ma_first = $(this).attr('bars');

		$('.indicator_interval_first').removeClass('current');
		$(this).addClass('current');

		if (ma_first == 0 && ma_second == 0)
			$('.indicator_ma').removeClass('current');
		else
			$('.indicator_ma').addClass('current');

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

		generateChart();
		setSettings();
	});
	
	$('#candle_chart').append('<div id="loading" style="padding: 10px;">Loading</div>');

	// Generating Chart
	function generateChart() {
		if(candle_chart != false)
			candle_chart.destroy();

		var data = {
			market: market,
			interval: interval
		};

		var loading;
		$('#candle_chart').append('<div id="loading" style="padding: 10px;">Loading</div>');

		$.ajax({
			url: "http://dogemonitor.com/data.php",
			data: data,
			dataType: 'json',
			timeout: 60000,
			beforeSend:function(xmlHttpRequest){
				clearInterval(ticker);

    			var d=0;
    			loading = ticker = setInterval(function() {
    				++d;
    				if(d==4) d=0;
					var text = "Loading";
					for(i=0;i<d;++i) {
						var text = text + ".";
					}

					$('#loading').html(text);
				}, 500);
    		},
			error: function (xhr, textStatus, errorThrown){
	            console.log(xhr);
	            console.log(textStatus);
	            console.log(errorThrown);
		    },
			complete: function(response) {
				var data = response.responseJSON;
				
				clearInterval(loading);
				$('#loading').remove();

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
					if (chart_type == "ohlc" || chart_type == "candlestick") {
						ohlc.push([
							data[i][0], // date
							data[i][1], // open
							data[i][2], // high
							data[i][3], // low
							data[i][4] // close
						]);
					}
					
					volume.push([
						data[i][0], // date
						data[i][5] // volume
					]);

					if (chart_type == "spline") {
						close.push([
							data[i][0],
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
							data[i][0],
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
							data[i][0],
							value2
						]);
					}
				}


				time_chart = data[data.length-1][0];

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

				//var series = [chart, ma, ma2, volume];

				candle_chart = new Highcharts.StockChart({
					//colors: ["#990f0f", "#7798BF", "#55BF3B", "#DF5353", "#aaeeee", "#ff0066", "#eeaaee",
		  			//	"#55BF3B", "#DF5353", "#7798BF", "#aaeeee"],
				    
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
									s += ', <strong>Volume:</strong> ' + Highcharts.numberFormat(p.y, 8) + ' DOGE';
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
		});

		/*function getTicker() {
			var data = {
				market: market,
				interval: interval,
				time_chart: time_chart,
				time_last: time_last
			};

			$.ajax({
				url: "http://dogemonitor.com/ticker.php",
				data: data,
				dataType: 'json',
    			timeout: 5000,
    			complete: function(response) {
    				var data = response.responseJSON;
					// Last trades
					for(i in data.last_trades) {
						var datetime = new Date(data.last_trades[i].datetime);
						var price = data.last_trades[i].price;
						var quantity = data.last_trades[i].quantity;

						current_price = price;

						var c = (last_trade_price > price) ? "r" : (last_trade_price < price) ? "g" : "";
						last_trade_price = price;
						time_last = data.last_trades[i].datetime;

						$('#history .mCSB_container').prepend('<div class="row"><div class="t">' + datetime.toLocaleTimeString() + '</div><div class="p ' + c + '">' + price + '</div><div class="q">' + quantity + '</div></div>');
						$("#history").mCustomScrollbar("update");

						var m = $('.ticker a[market="' + market + '"]').html();
						window.document.title = price + " BTC/DOGE - " + m + " - DogeMonitor.com";
					}

					// Markets tickers
					for(i in data.tickers) {
						var m = data.tickers[i].market;
						var price = data.tickers[i].price;

						var el = $('.ticker > span[market="'+m+'"]');

						if (last_tickers.m > price) {
							el.removeClass();
							el.addClass('r');
							el.html('&darr; ' + price + ' BTC');
						} else if (last_tickers.m < price) {
							el.removeClass();
							el.addClass('g');
							el.html('&uarr; ' + price + ' BTC');
						} else if (last_tickers.m === undefined) {
							el.removeClass();
							el.addClass('g');
							el.html(price + ' BTC');
						}
					}

					// New values
					for(i in data.new_values) {
						var value = data.new_values[i];
						var d_ohlc = [
							value[0], // date
							value[1], // open
							value[2], // high
							value[3], // low
							value[4] // close
						];
						var d_volume = [
							value[0], // date
							value[5] // volume
						];
						var d_close = [
							value[0],
							value[4]
						];

						if(chart_type == "spline") 
							candle_chart.series[0].addPoint(close);
						else
							candle_chart.series[0].addPoint(d_ohlc);

						var i = 1;
						if(ma_first > 0)
							i += 1;
						if(ma_second > 0)
							i += 1;

						candle_chart.series[i].addPoint(d_volume);

						time_chart = value[0];
					}

					// Market depth
					var asks = data.market_depth.asks;
					var bids = data.market_depth.bids;

					$('#orders_ask .row').remove();
					for(i in asks) {
						var q = asks[i];

						$('#orders_ask .mCSB_container').append('<div class="row"><div class="p">' + i + '</div><div class="q">' + q + '</div></div>');
					}
					$("#orders_ask").mCustomScrollbar("update");

					var count = 0;
					$('#orders_bid .row').remove();
					for(i in bids) {
						++count;
						var q = bids[i];

						$('#orders_bid .mCSB_container').prepend('<div class="row"><div class="p">' + i + '</div><div class="q">' + q + '</div></div>');
					}
					var p = Math.floor(($('#orders_ask').height() - (count * 11)) / 11);
					for(i=0;i<p;++i) {
						$('#orders_bid .mCSB_container').prepend('<div class="row"><div class="p">&nbsp;</div><div class="q">&nbsp;</div></div>');
					}
					$("#orders_bid").mCustomScrollbar("update");
					$("#orders_bid").mCustomScrollbar("scrollTo","last");


					// // Currency converted
					// var kdoge = current_price*1000;
					
					// currencies = data.currencies;
					// for(cur in currencies) {
					// 	if(cur == currency) {
					// 		var value = Math.round(kdoge*currencies[cur] * 1000)/1000;
					// 		$('.currency_value').html(value);

					// 		break;
					// 	}
					// }
				}
			});
		}
	}*/

	function setSettings() {
		settings = {
			market: market,
			interval: interval,
			chart_type: chart_type,
			//currency: currency,
			ma_first: ma_first,
			ma_second: ma_second
		};

		setCookie('settings', JSON.stringify(settings));
	}

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

		$('#history_outer').css('height', ((h-100)*0.6) + 'px');
		$('#history').css('height', (((h-100)*0.4) - 10)  + 'px');

		//$('#advertisment').css('width', '280px');
		//var space_height = $('#main').height() - 560;
		//if (space_height < 0)
		//	space_height = 0;
		//$('#advertisment .space').css('height', space_height + 'px');
	});
	$(window).resize();

	generateChart();
});

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
