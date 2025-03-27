import React from "react";
import { Outlet } from "react-router-dom";
import "./Home.css";

function Home() {
  console.log("HomePage is here");
  return (
    <div className="landing-wrapper">
      <div className="landing-text-1">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque eget
        commodo erat, a faucibus magna. Donec sed pharetra nisl, a imperdiet
        ipsum. Aliquam molestie consequat massa at semper. Nulla vel sapien at
        elit elementum rhoncus. Vestibulum ante ipsum primis in faucibus orci
        luctus et ultrices posuere cubilia curae; Phasellus iaculis tempus eros,
        eu varius leo lacinia eget. Cras vulputate velit nec augue consequat,
        quis consectetur eros scelerisque. Vestibulum a feugiat nibh. Nam at
        quam facilisis, molestie lectus non, pretium metus. Nullam a ligula
        congue, euismod tortor nec, interdum purus. Aliquam vehicula quis nibh
        dapibus efficitur. Phasellus diam tortor, porttitor ut fringilla quis,
        molestie ut lectus. Fusce gravida ultrices mi a tristique. Cras id diam
        non eros rhoncus condimentum. Donec in varius tortor. Donec tristique
        ipsum quis lorem aliquam, non molestie metus ultrices. Donec sed feugiat
        nulla. Nam eu odio et ligula gravida cursus. Sed sit amet tellus eget
        dui condimentum tristique et a massa. Suspendisse eget maximus ante.
        Fusce quam ipsum, eleifend sed faucibus et, suscipit in ex. Sed nibh
        lectus, ultrices quis nunc nec, eleifend convallis lectus. Nam non augue
        est. Maecenas eget est leo. Nulla non tellus eget ex rutrum aliquet.
        Nullam posuere elit nec pretium lacinia. Donec quis interdum nisi. Nunc
        volutpat urna purus. Nulla vitae risus tempor lorem mattis dapibus eget
        a libero. Cras convallis nulla id elit pretium tincidunt. Nulla
        hendrerit, risus hendrerit dictum fringilla, lorem leo molestie justo,
        ac ullamcorper orci sem quis tortor. Vestibulum ac est eget metus
        accumsan placerat in ac justo. Nunc tempus elit efficitur velit
        ultrices, eget dapibus neque egestas. Duis quis pulvinar sapien. Aenean
        semper enim ut leo varius euismod eu vitae libero. Proin vel feugiat
        lacus, vitae porttitor eros. Etiam feugiat cursus nisl sit amet commodo.
        Etiam ac quam quis elit vulputate suscipit quis ac urna. Fusce commodo
        placerat lorem, ac blandit urna molestie a. Aliquam aliquam mollis
        tellus, eget placerat nunc commodo in. Vivamus scelerisque aliquet
        convallis. Nunc lacinia velit tempus, cursus tortor sit amet, molestie
        felis. Aliquam convallis, risus ac imperdiet feugiat, nisi ligula
        gravida sapien, vitae gravida eros diam quis velit. Donec lacinia porta
        venenatis. Sed lobortis massa mauris, nec egestas enim cursus at.
        Pellentesque venenatis gravida eros, interdum condimentum diam tincidunt
        a. Duis ut odio ac ligula pretium egestas. Curabitur id hendrerit urna.
        Ut quis placerat lectus, sit amet vestibulum tortor. Ut metus eros,
        vehicula in sodales nec, pulvinar at dui. Donec posuere est erat, vel
        ultrices augue bibendum nec. Nullam semper nisi ac ipsum mollis
        placerat.
      </div>
      <div className="landing-text-2">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. In sed enim
        iaculis, venenatis odio in, imperdiet enim. Duis consequat lorem vitae
        dolor tempus, sit amet pretium nulla rutrum. In ullamcorper massa ac
        elementum suscipit. Pellentesque habitant morbi tristique senectus et
        netus et malesuada fames ac turpis egestas. Etiam sit amet quam orci.
        Cras auctor eros id arcu pharetra, ut aliquet urna interdum. Vestibulum
        et aliquam neque, id mollis ante. Ut fringilla magna id massa
        consectetur tempus. In tincidunt diam diam, sit amet sollicitudin arcu
        posuere sed. Donec accumsan pharetra nisl id condimentum. Curabitur
        ornare elit a lacinia rutrum. Nam fermentum felis tincidunt,
        sollicitudin massa vel, fringilla mi. Interdum et malesuada fames ac
        ante ipsum primis in faucibus. Aenean quis porttitor sapien. Morbi ac
        purus eu leo tristique egestas. Nunc vitae vulputate augue. Donec
        lobortis gravida sem. Aenean purus justo, sodales in erat non, suscipit
        scelerisque elit. In mi diam, imperdiet id nunc sed, dapibus fermentum
        ante. Etiam eu auctor metus. Nam et eros fringilla, fringilla magna sit
        amet, consectetur magna. Nullam id feugiat magna. Etiam faucibus, nibh
        vel ornare ultrices, elit libero laoreet enim, sed fermentum arcu felis
        eu ipsum. Aliquam dui justo, vestibulum sollicitudin gravida vel,
        pretium sit amet lectus. Vestibulum ut nunc aliquet tortor egestas
        aliquet.
      </div>
      <div className="landing-text-contact">
        <div>Contact Phone</div>
        <div>Contact Email</div>
        <div>Contact Address</div>
      </div>
      <Outlet />
    </div>
  );
}

export default Home;
