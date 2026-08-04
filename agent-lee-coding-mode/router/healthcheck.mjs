const response = await fetch("http://localhost:8080/health");
const json = await response.json();
console.log(JSON.stringify(json, null, 2));
