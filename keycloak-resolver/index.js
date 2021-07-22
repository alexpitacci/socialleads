/*
This code was inspired by the following Tutorial:
https://hasura.io/learn/graphql/hasura/custom-business-logic/2-remote-schemas/
and then translated to work with Keycloak.
*/
const { ApolloServer } = require('apollo-server');
const gql = require('graphql-tag');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

process.on('SIGINT', process.exit);

const PORT = process.env.PORT || 3001;
const KEYCLOAK_HOST = process.env.KEYCLOAK_HOST || 'http://keycloak:8080';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'admin';
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || 'admin';

const getKeycloakAdminToken = async (client_id, client_secret) => {
    const response = await fetch(
        KEYCLOAK_HOST + '/auth/realms/socialleads/protocol/openid-connect/token',
        {
            method: 'POST',
            body: new URLSearchParams({ client_id: client_id, client_secret: client_secret, grant_type: 'client_credentials' })
        }
    );
    const json = await response.json();
    return json.access_token;
}

const getKeycloakProfileInfo = async (user_id) => {
    const headers = {
        'Authorization': 'Bearer ' + await getKeycloakAdminToken(KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET),
    };
    const response = await fetch(KEYCLOAK_HOST + '/auth/admin/realms/socialleads/users/' + user_id, { headers: headers })
    return response.json();
}

const typeDefs = gql`
  type keycloak_profile {
    username: String
    firstName: String
    lastName: String
    email: String
    emailVerified: String
  }
  type Query {
    keycloak: keycloak_profile
  }
`;
const resolvers = {
    Query: {
        keycloak: async (parent, args, context) => {
            const token = (context.headers.authorization || '').replace('Bearer ', '');
            if (!token) {
                return 'Authorization token is missing!';
            }
            try {
                const decoded = jwt.decode(token);
                const profileInfo = await getKeycloakProfileInfo(decoded.sub);
                return {
                    username: profileInfo.username,
                    firstName: profileInfo.firstName,
                    lastName: profileInfo.lastName,
                    email: profileInfo.email,
                    emailVerified: profileInfo.emailVerified,
                };
            } catch (error) {
                console.error(error);
                return null;
            }
        },
    },
};
const context = ({ req }) => {
    return { headers: req.headers };
};
const app = new ApolloServer({ typeDefs, resolvers, context });
app.listen({ port: PORT });