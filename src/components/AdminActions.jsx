import React from "react";
import { Card } from "react-bootstrap";
import "./admin-actions.css";
import addItem from "../itemPhotos/add_item.png";
import moveItem from "../itemPhotos/move_item.jpg";
import findItem from "../itemPhotos/find-icon.jpg";
import editItem from "../itemPhotos/edit_item.png";
import { useNavigate } from "react-router-dom";

function AdminActions() {
  const navigate = useNavigate();

  const addPart = () => {
    navigate("add");
    console.log("Admin Add");
  };

  const movePart = () => {
    // Placeholder handler
    console.log("Admin Move");
  };

  const locatePart = () => {
    // Placeholder handler
    console.log("Admin Locate");
  };

  const editPart = () => {
    // Placeholder handler
    console.log("Admin Edit");
  };

  return (
    <div className="action-container">
      <div className="admin-action">
        <Card className="action-1">
          <Card.Body>
            <Card.Title>
              <img src={addItem} className="action-image" alt="add" />
            </Card.Title>
            <Card.Text></Card.Text>
            <hr className="admin-divider" />
          </Card.Body>
          <Card.Footer>
            <p className="admin-footer">Add New Part</p>
            <button className="admin-button " onClick={addPart}>
              Add
            </button>
          </Card.Footer>
        </Card>
      </div>
      <div className="admin-action">
        <Card className="action-2">
          <Card.Body>
            <Card.Title>
              <img src={moveItem} className="action-image" alt="move" />
            </Card.Title>
            <Card.Text></Card.Text>
            <hr className="admin-divider" />
          </Card.Body>
          <Card.Footer>
            <p className="admin-footer">Move Part</p>
            <button className="admin-button " onClick={movePart}>
              Move
            </button>
          </Card.Footer>
        </Card>
      </div>
      <div className="admin-action">
        <Card className="action-3">
          <Card.Body>
            <Card.Title>
              <img src={findItem} className="action-image" alt="find" />
            </Card.Title>
            <Card.Text></Card.Text>
            <hr className="admin-divider" />
          </Card.Body>
          <Card.Footer>
            <p className="admin-footer">Locate Part</p>
            <button className="admin-button " onClick={locatePart}>
              Locate
            </button>
          </Card.Footer>
        </Card>
      </div>
      <div className="admin-action">
        <Card className="action-4">
          <Card.Body>
            <Card.Title>
              <img src={editItem} className="action-image" alt="edit" />
            </Card.Title>
            <Card.Text></Card.Text>
            <hr className="admin-divider" />
          </Card.Body>
          <Card.Footer>
            <p className="admin-footer">Edit Part</p>
            <button className="admin-button " onClick={editPart}>
              Edit
            </button>
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
}

export default AdminActions;
