# MEDUSA-PAYMENT-RAZORPAY

[RAZORPAY](https://razorpay.comm) an immensely popular payment gateway with a host of features. 
This plugin enables the razorpay payment interface on [medusa](https://medusajs.com) commerce stack

## Installation

Use the package manager npm to install medusa-payment-razorpay.

```bash
npm install medusa-payment-razorpay
```

## Usage


Register for a razorpay account and generate the api keys
In your environment file (.env) you need to define 
```
RAZORPAY_API_KEY=<your api key>
RAZORPAY_API_KEY_SECRET=<your api key secret>
```
You need to add the plugin into your medusa-config.js as shown below

```
const plugins = [
  ...,
  {
    resolve:`medusa-payment-razorpay`,
    options:{
        api_key : process.env.RAZORPAY_API_KEY,
        api_key_secret:process.env.RAZORPAY_API_KEY_SECRET
    }
  },
  ...]
```
## Client side configuration

You can refer this to see how the client side is implemented for the gatsby medusa starter
SGFGOV:feat/medusa-payment-razorpay (https://github.com/SGFGOV/gatsby-starter-medusa/tree/feat/medusa-payment-razorpay)

On the client you need to specify on the api key not the api secrets :)

For the nextjs start you need to  make the following changes 

1. Install package to your next starter. This just makes it easier, importing all the scripts implicitly
```
yarn add react-razorpay

```
2. Add updatePaymentSession into your checkOutContext - <next-starter>/src/lib/context/checkout-context.tsx
```
const {
    mutate: updatePaymentSessionMutation,
    isLoading: updatingPaymentSession,
  } = useUpdatePaymentSession(cart?.id!)


const updatePaymentSession = (providerId: string,data:StorePostCartsCartPaymentSessionUpdateReq) => {
    if (cart) {
      updatePaymentSessionMutation(
        {
          provider_id: providerId,
          ...data
        },
        {
          onSuccess: ({ cart }) => {
            setCart(cart)
          },
        }
      )
    }
  }
// add that to the return context
return (
    <FormProvider {...methods}>
      <CheckoutContext.Provider
        value={{
          cart,
          shippingMethods,
          isLoading,
          readyToComplete,
          sameAsBilling,
          editAddresses,
          initPayment,
          setAddresses,
          setSavedAddress,
          setShippingOption,
          setPaymentSession,
          onPaymentCompleted,
          updatePaymentSession,
        }}
      >
        <Wrapper paymentSession={cart?.payment_session}>{children}</Wrapper>
      </CheckoutContext.Provider>
    </FormProvider>
  )
```
3. Create a button for Razorpay <next-starter>/src/modules/checkout/components/payment-button/index.tsx

like below

````
const RazorpayPaymentButton = ({
  session,
  notReady,
}: {
  session: PaymentSession
  notReady: boolean
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  )
  const Razorpay = useRazorpay();
  

  const { cart } = useCart()
  const { onPaymentCompleted,updatePaymentSession } = useCheckout()
  const orderData = session.data as Record<string,string>
  const handlePayment = useCallback(() => {

    const options: RazorpayOptions = {
      key: RAZORPAY_API,
      amount: session.amount.toString(),
      currency: orderData.currency.toLocaleUpperCase(),
      name: process.env.COMPANY_NAME??"SGF",
      description: `Order number ${orderData.id}`,
      //image: "https://example.com/your_logo",
      order_id: orderData.id,
     
      "prefill":{
        "name":cart?.billing_address.first_name + " "+ cart?.billing_address.last_name,
        "email":cart?.email,
        "contact":(cart?.shipping_address?.phone)??undefined
    },
    "notes": {
      "address": cart?.billing_address,
      "order_notes":session.data.notes
    },
    "theme": {
      "color": "1234"
    },
    "modal": {  
                "ondismiss": (()=>{ 
                            console.log("dismissed payment");
                            setSubmitting(false) 
                          return false})  ()

                      },
    "handler": async (response) => {console.log(response);
      
      if (!response) {
        const error = "razorpay unsuccessful"
        console.log(error)
        setErrorMessage(error);
        setSubmitting(false);
        return;
      }
      else{
        updatePaymentSession("razorpay",response as unknown as StorePostCartsCartPaymentSessionUpdateReq)
        onPaymentCompleted()
      }
      return;
      
   },
    };

    const razorpay = new Razorpay(options);
    razorpay.on('payment.submit', function (data: { method: string }) {
      if (data.method === 'bank_transfer') {
        console.log("initiating bank transfer")
      }
    });
    razorpay.on('virtual_account.credited', function(){onPaymentCompleted()})
    razorpay.open();  
  }, [Razorpay]);
  return (
    <div>
      <button onClick={handlePayment} disabled={notReady || submitting}>Pay with Razorpay</button>
    </div>
  )
}

````
## Contributing


Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)



## Disclaimer
The code was tested on limited number of usage scenarios. There maybe unforseen bugs, please raise the issues as they come, or create pull requests if you'd like to submit fixes.


## Support us 

As much as we love FOSS software, nothing in this world is truely free. We'll be grateful if you can buy our team a coffee (https://www.buymeacoffee.com/uMRqW9NmS9). 