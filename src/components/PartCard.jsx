import React from "react";
import { Card, Button } from "react-bootstrap";
import "./CardStyles.css";

function PartCard(props) {
  const partClickEvent = () => {
    // Placeholder handler
    console.log("Selected:", props.name);
  };

  return (
    <div className="single-item">
      <Card>
        <Card.Header />
        <Card.Body>
          <Card.Title>
            <img src={props.photo} className="item-image" alt="item" />
          </Card.Title>
          <Card.Text>
            <p className="card-text">{props.condition}</p>
            <p className="card-price">{props.price}</p>
          </Card.Text>
          <hr className="card-divider" />
        </Card.Body>

        <Card.Footer>
          <p className="part-name">{props.name}</p>
          <Button
            className="card-button btn btn-warning"
            onClick={partClickEvent}
          >
            View
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}

export default PartCard;
