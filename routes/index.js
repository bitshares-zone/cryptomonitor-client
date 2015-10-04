
/*
 * GET home page.
 */

exports.index = function(req, res){
  //var curr = req.headers.host.split('.')[0].toUpperCase();
  res.render('index', { currency: 'bts' });
};