interface ApiResponse {
  message: string;
  payload: any;
}

const createResponse = (message: string, payload: any): ApiResponse => {
  return {
    message,
    payload,
  };
};

export default createResponse;
