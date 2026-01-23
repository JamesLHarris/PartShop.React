import React from "react";
import { Card } from "react-bootstrap";
import "./CardStyles.css";
import { useNavigate } from "react-router-dom";

function AdminCard(props) {
  const navigate = useNavigate();

  const partClickEvent = () => {
    navigate(`/admin/part/${props.id}`);
    console.log("Selected Admin Card:", props);
  };

  const imageUrl = `https://localhost:7274${props.photo}`;
  const formattedPrice = `$${parseFloat(props.price).toFixed(2)}`;
  const rustedStatus = props.rusted ? "Rusted" : "Unrusted";
  const testedStatus = props.tested ? "Tested" : "Untested";

  return (
    <div className="single-item">
      <Card>
        <Card.Body>
          <Card.Title>
            <img src={imageUrl} className="item-image" alt="item" />
          </Card.Title>
          <Card.Text>
            <div className="card-info-wrapper">
              <div className="card-condition-row">
                <div className="card-text">
                  <div>{testedStatus}</div>

                  <div>{rustedStatus}</div>
                </div>
              </div>

              <div className="card-price">{formattedPrice}</div>
            </div>
          </Card.Text>
          <hr className="card-divider" />
        </Card.Body>

        <Card.Footer>
          <div className="part-name">{props.name}</div>
          <button className="card-button" onClick={partClickEvent}>
            View
          </button>
        </Card.Footer>
      </Card>
    </div>
  );
}

export default AdminCard;
