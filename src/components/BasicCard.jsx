import Button from "react-bootstrap/Button";
import { Link } from "react-router-dom";
import Card from "react-bootstrap/Card";

function BasicCard() {
  return (
    <div>
      <header></header>
      <body className="container d-flex justify-content-center">
        <Card>
          <Card.Body>
            <Button className="primary">TEST</Button>
            <Link to="/" className="btn btn-warning">
              GO BACK
            </Link>
          </Card.Body>
        </Card>
      </body>
    </div>
  );
}

export default BasicCard;
