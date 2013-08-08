using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;

namespace ExampleApp.Controllers
{
    public class MarkersController : ApiController
    {
        // GET api/markers
        public IEnumerable<object> Get()
        {
			List<dynamic> data = new List<object>();

			Random rand = new Random(DateTime.Now.Millisecond);

			for (int i = 0; i < 150; i++)
			{
				data.Add(new
				{
					lat = rand.Next(0, 90) * (rand.NextDouble() - rand.NextDouble()),
					lon = rand.Next(0, 180) * (rand.NextDouble() - rand.NextDouble()),
					timestamp = DateTime.Now,
					userDefinedData = String.Format("{0} : {1} : {2}", rand.Next(), rand.NextDouble(), rand.NextDouble())
				});
			}

			var query = from item in data
						select new
						{
							lat = item.lat,
							lon = item.lon,
							timestamp = item.timestamp,
							userDefinedData = item.userDefinedData
						};

			return query.AsEnumerable();
        }
    }
}
