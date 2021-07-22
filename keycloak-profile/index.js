/*
This code was inspired by the following Tutorial:
https://hasura.io/learn/graphql/hasura/custom-business-logic/1-actions/
and then translated to work with Keycloak.
*/

const express = require("express");
const bodyParser = require("body-parser");
const fetch = require('node-fetch');

process.on('SIGINT', process.exit);

const PORT = process.env.PORT || 3000;
const KEYCLOAK_HOST = process.env.KEYCLOAK_HOST || 'http://keycloak:8080';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'admin';
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || 'Pa55w0rd';

const getKeycloakAdminToken = async (client_id, client_secret) => {
    const response = await fetch(
        KEYCLOAK_HOST + '/auth/realms/socialleads/protocol/openid-connect/token',
        {
            method: 'POST',
            body: new URLSearchParams({ client_id: client_id, client_secret: client_secret, grant_type: 'client_credentials'})
        }
    );
    const json = await response.json();
    return json.access_token;
}

const getKeycloakProfileInfo = async (user_id) => {
    const headers = {
        'Authorization': 'Bearer ' + await getKeycloakAdminToken(KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET),
    };
    const response = await fetch(KEYCLOAK_HOST + '/auth/admin/realms/socialleads/users/' + user_id,{ headers: headers})
    return response.json();
}

const app = express();
app.use(bodyParser.json());
app.post('/keycloak', async (req, res) => {
    try {
        const { session_variables } = req.body;
  
        const user_id = session_variables['x-hasura-user-id'];
        const profileInfo = await getKeycloakProfileInfo(user_id);
        return res.json({
            name: profileInfo.username,
            email: profileInfo.email,
        });
    } catch (error) {
        console.error(error);
        return res.status(400).json({
            message: "error happened"
        })
    }
});
app.listen(PORT);