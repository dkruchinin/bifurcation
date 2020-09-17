const NUM_ITERS = 100;

const data = {
    labels: [],
    datasets: [
        {
            label: "Logistic Map",
            fill: false,
            lineTension: 0.1,
            backgroundColor: "rgba(79,202,221)",
            borderColor: "rgba(79,202,221)",
            borderCapStyle: 'butt',
            borderDash: [],
            borderWidth: 2,
            borderDashOffset: 0.0,
            borderJoinStyle: 'miter',
            pointBorderColor: "rgba(111,192,204)",
            pointBackgroundColor: "#fff",
            pointBorderWidth: 1,
            pointHoverRadius: 1,
            pointHoverBackgroundColor: "rgba(111,192,204)",
            pointHoverBorderColor: "rgba(111,192,204)",
            pointHoverBorderWidth: 0,
            pointRadius: 1,
            pointHitRadius: 1,
            data: [],
        }
    ]
};

function logistic_map(r, x0, n_iters) {
	let x = x0;
	myLineChart.data.datasets[0].data = [];
  myLineChart.data.labels = [];
  for (let i = 0; i < n_iters; i++) {
    myLineChart.data.labels.push(i);
  	myLineChart.data.datasets[0].data.push(x);
    x = r * x * (1 - x);
  }
  myLineChart.update();
}

const option = {
	showLines: true
};

const canvas = document.getElementById('logistic-map').getContext('2d');
const myLineChart = Chart.Line(canvas,{
	data: data,
  options: option
});

document.getElementById("r_scale").oninput = function() {
  document.getElementById("r_value").innerHTML = this.value;
  const r = this.value;
  const x0 = document.getElementById("x0_value").innerHTML;
  logistic_map(this.value, x0, NUM_ITERS);
}

document.getElementById("x0_scale").oninput = function() {
  document.getElementById("x0_value").innerHTML = this.value;
  const r = document.getElementById("r_value").innerHTML;
  const x0 = this.value;
  logistic_map(r, x0, NUM_ITERS);
}

const r = document.getElementById("r_value").innerHTML
const x0 = document.getElementById("x0_value").innerHTML
logistic_map(r, x0, NUM_ITERS);
