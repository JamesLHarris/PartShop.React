import React from "react";
import { Card } from "react-bootstrap";
import "./CardStyles.css";

function DogCard(props) {
  const partClickEvent = () => {
    // Placeholder handler
    console.log("Selected:", props.name);
  };

  const formattedPrice = `$${parseFloat(props.price).toFixed(2)}`;

  return (
    <div className="single-item">
      <Card>
        <Card.Header />
        <Card.Body>
          <Card.Title>
            <img src={props.photo} className="item-image" alt="item" />
          </Card.Title>
          <Card.Text>
            <div className="condition-price-row">
              <p className="card-text">{props.condition}</p>
              <p className="card-price">{formattedPrice}</p>
            </div>
          </Card.Text>
          <hr className="card-divider" />
        </Card.Body>

        <Card.Footer>
          <p className="part-name">{props.name}</p>
          <button className="card-button " onClick={partClickEvent}>
            View
          </button>
        </Card.Footer>
      </Card>
    </div>
  );
}

export default DogCard;
