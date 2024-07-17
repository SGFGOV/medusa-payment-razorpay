# MEDUSA-PAYMENT-RAZORPAY

# Support the Medusa-Payment-Razorpay Plugin - Elevate Our Medusa Community!

Dear Developers and E-commerce Enthusiasts,

Are you ready to revolutionize the world of online stores with MedusaJS? We have an exciting opportunity that will make payment processing a breeze for our beloved Medusa platform! Introducing the Medusa-Payment-Razorpay plugin, a community-driven project that brings the immensely popular [RAZORPAY](https://razorpay.com) payment gateway to our MedusaJS commerce stack.

**What's in it for You:**

🚀 Streamline Payment Processing: With Medusa-Payment-Razorpay, you can unleash the full potential of Razorpay's features, ensuring seamless and secure payments for your customers.

🌐 Global Reach: Engage with customers worldwide, as Razorpay supports various currencies and payment methods, catering to a diverse audience.

🎉 Elevate Your Medusa Store: By sponsoring this plugin, you empower the entire Medusa community, driving innovation and success across the platform.

## Installation Made Simple

No hassle, no fuss! Install Medusa-Payment-Razorpay effortlessly with npm:

```bash
npm install medusa-payment-razorpay



[RAZORPAY](https://razorpay.com) an immensely popular payment gateway with a host of features. 
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
RAZORPAY_ID=<your api key>
RAZORPAY_SECRET=<your api key secret>
RAZORPAY_ACCOUNT=<your razorpay account number/merchant id>
```
You need to add the plugin into your medusa-config.js as shown below

```
const plugins = [
  ...,
  {
    resolve:`medusa-payment-razorpay`,
    options:{
         key_id: process.env.RAZORPAY_ID,
                key_secret: process.env.RAZORPAY_SECRET,
                razorpay_account: process.env.RAZORPAY_ACCOUNT,                
                automatic_expiry_period: 30, /*any value between 12 minutes and 30 days expressed in minutes*/
                manual_expiry_period: 20,
                refund_speed: "normal", 
                webhook_secret: process.env.RAZORPAY_SECRET,
    }
  },
  ...]
```
## Client side configuration


For the NextJs start you need to  make the following changes 

1. Install package to your next starter. This just makes it easier, importing all the scripts implicitly
```
yarn add react-razorpay

```
2. Create a button for Razorpay <next-starter>/src/modules/checkout/components/payment-button/index.tsx

like below



````
"use client"

import { Cart, PaymentSession } from "@medusajs/medusa"
import { Button } from "@medusajs/ui"
import { OnApproveActions, OnApproveData } from "@paypal/paypal-js"
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import { placeOrder } from "@modules/checkout/actions"
import React, { useCallback, useState } from "react"
import ErrorMessage from "../error-message"
import Spinner from "@modules/common/icons/spinner"

import useRazorpay, { RazorpayOptions } from "react-razorpay"

type PaymentButtonProps = {
  cart: Omit<Cart, "refundable_amount" | "refunded_total">,
  'data-testid': string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({ cart, 'data-testid': dataTestId }) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    cart.shipping_methods.length < 1
      ? true
      : false

  const paymentSession = cart.payment_session as PaymentSession


  switch (paymentSession.provider_id) {
    case "razorpay":
      return <RazorpayPaymentButton notReady={notReady} cart={cart} session={paymentSession} data-testid={dataTestId} />
    case "manual":
      return <ManualTestPaymentButton notReady={notReady} data-testid={dataTestId} />
    case "paypal":
      return <PayPalPaymentButton notReady={notReady} cart={cart} data-testid={dataTestId} />
    default:
      return <Button disabled>Select a payment method</Button>
  }
}




const RazorpayPaymentButton = ({
  session,
  notReady,
  cart
}: {
  session: PaymentSession
  notReady: boolean
  cart: Omit<Cart, "refundable_amount" | "refunded_total">
}) => {
  const [disabled, setDisabled] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [Razorpay] = useRazorpay();

  const orderData = session.data as Record<string, string>
  const onPaymentCompleted = async () => {
    await placeOrder().catch(() => {
      setErrorMessage("An error occurred, please try again.")
      setSubmitting(false)
    })
  }


  const handlePayment = useCallback(() => {
    const options: RazorpayOptions = {
      callback_url: `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/razorpay/hooks`,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY ?? '',
      amount: session.amount.toString(),
      order_id: orderData.id,
      currency: cart.region.currency_code.toLocaleUpperCase(),
      name: process.env.COMPANY_NAME ?? "ShopNTrolly ",
      description: `Order number ${orderData.id}`,

      image: "https://example.com/your_logo",
      modal: {
        backdropclose: true,
        escape: true,
        handleback: true,
        confirm_close: true,
        ondismiss: () => {
          setSubmitting(false)
        },
        animation: true,
      },
      handler: async (args) => {
        onPaymentCompleted()
      },
      "prefill": {
        "name": cart?.billing_address.first_name + " " + cart?.billing_address.last_name  ,
        "email": cart?.email,
        "contact":( cart?.billing_address?.phone || cart?.shipping_address?.phone) as string
      },
      "notes": {
        "address": cart?.billing_address,
        "order_notes": session.data.notes
      },
      
    };

    const razorpay = new Razorpay(options);
    razorpay.open();
    razorpay.on("payment.failed", function (response: any) {
      setErrorMessage(JSON.stringify(response.error))
    })
    razorpay.on("payment.authorized", function (response: any) {

    })
    razorpay.on("payment.captured", function (response: any) {

    }
    )
  }, [Razorpay]);
  return (
    <>
      <Button
        disabled={submitting || notReady}
        onClick={handlePayment}
      >
        {submitting ? <Spinner /> : "Place Your Order"}
      </Button>
      {errorMessage && (
        <div className="text-red-500 text-small-regular mt-2">
          {errorMessage}
        </div>
      )}
    </>
  )
}

export default PaymentButton

`````

Step 3. 

nextjs-starter-medusa/src/lib/constants.tsx
add
 
```
 razorpay: {
    title: "Razorpay",
    icon: <CreditCard />,
  },
````

step 3. Go to  <next-starter>/src/modules/checkout/action.ts/
add update customer to the setAddresses func (for fixing no customer billiing found error))
```
"use server"

import { cookies } from "next/headers"

import {
  addShippingMethod,
  completeCart,
  deleteDiscount,
  setPaymentSession,
  updateCart,
  updateCustomer,
} from "@lib/data"
import {
  GiftCard,
  StorePostCartsCartReq,
  StorePostCustomersCustomerReq,
} from "@medusajs/medusa"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"

export async function cartUpdate(data: StorePostCartsCartReq) {
  const cartId = cookies().get("_medusa_cart_id")?.value

  if (!cartId) return "No cartId cookie found"

  try {
    await updateCart(cartId, data)
    revalidateTag("cart")
  } catch (error: any) {
    return error.toString()
  }
}

export async function applyDiscount(code: string) {
  const cartId = cookies().get("_medusa_cart_id")?.value

  if (!cartId) return "No cartId cookie found"

  try {
    await updateCart(cartId, { discounts: [{ code }] }).then(() => {
      revalidateTag("cart")
    })
  } catch (error: any) {
    throw error
  }
}

export async function applyGiftCard(code: string) {
  const cartId = cookies().get("_medusa_cart_id")?.value

  if (!cartId) return "No cartId cookie found"

  try {
    await updateCart(cartId, { gift_cards: [{ code }] }).then(() => {
      revalidateTag("cart")
    })
  } catch (error: any) {
    throw error
  }
}

export async function removeDiscount(code: string) {
  const cartId = cookies().get("_medusa_cart_id")?.value

  if (!cartId) return "No cartId cookie found"

  try {
    await deleteDiscount(cartId, code)
    revalidateTag("cart")
  } catch (error: any) {
    throw error
  }
}

export async function removeGiftCard(
  codeToRemove: string,
  giftCards: GiftCard[]
) {
  const cartId = cookies().get("_medusa_cart_id")?.value

  if (!cartId) return "No cartId cookie found"

  try {
    await updateCart(cartId, {
      gift_cards: [...giftCards]
        .filter((gc) => gc.code !== codeToRemove)
        .map((gc) => ({ code: gc.code })),
    }).then(() => {
      revalidateTag("cart")
    })
  } catch (error: any) {
    throw error
  }
}

export async function submitDiscountForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string

  try {
    await applyDiscount(code).catch(async (err) => {
      await applyGiftCard(code)
    })
    return null
  } catch (error: any) {
    return error.toString()
  }
}

export async function setAddresses(currentState: unknown, formData: FormData) {
  if (!formData) return "No form data received"

  const cartId = cookies().get("_medusa_cart_id")?.value

  if (!cartId) return { message: "No cartId cookie found" }

  const data = {
    shipping_address: {
      first_name: formData.get("shipping_address.first_name"),
      last_name: formData.get("shipping_address.last_name"),
      address_1: formData.get("shipping_address.address_1"),
      address_2: "",
      company: formData.get("shipping_address.company"),
      postal_code: formData.get("shipping_address.postal_code"),
      city: formData.get("shipping_address.city"),
      country_code: formData.get("shipping_address.country_code"),
      province: formData.get("shipping_address.province"),
      phone: formData.get("shipping_address.phone"),
    },
    email: formData.get("email"),
  } as StorePostCartsCartReq

  const sameAsBilling = formData.get("same_as_billing")

  if (sameAsBilling === "on") data.billing_address = data.shipping_address

  if (sameAsBilling !== "on")
    data.billing_address = {
      first_name: formData.get("billing_address.first_name"),
      last_name: formData.get("billing_address.last_name"),
      address_1: formData.get("billing_address.address_1"),
      address_2: "",
      company: formData.get("billing_address.company"),
      postal_code: formData.get("billing_address.postal_code"),
      city: formData.get("billing_address.city"),
      country_code: formData.get("billing_address.country_code"),
      province: formData.get("billing_address.province"),
      phone: formData.get("billing_address.phone"),
    } as StorePostCartsCartReq

  const customer = {
    billing_address: {
      first_name: formData.get("billing_address.first_name"),
      last_name: formData.get("billing_address.last_name"),
      company: formData.get("billing_address.company"),
      address_1: formData.get("billing_address.address_1"),
      address_2: formData.get("billing_address.address_2"),
      city: formData.get("billing_address.city"),
      postal_code: formData.get("billing_address.postal_code"),
      province: formData.get("billing_address.province"),
      country_code: formData.get("billing_address.country_code"),
      phone: formData.get("billing_address.phone"),
    },
  } as StorePostCustomersCustomerReq

  try {
    await updateCart(cartId, data)
    revalidateTag("cart")

    await updateCustomer(customer).then(() => {
      revalidateTag("customer")
    })
  } catch (error: any) {
    return error.toString()
  }

  redirect(
    `/${formData.get("shipping_address.country_code")}/checkout?step=delivery`
  )
}

export async function setShippingMethod(shippingMethodId: string) {
  const cartId = cookies().get("_medusa_cart_id")?.value

  if (!cartId) throw new Error("No cartId cookie found")

  try {
    await addShippingMethod({ cartId, shippingMethodId })
    revalidateTag("cart")
  } catch (error: any) {
    throw error
  }
}

export async function setPaymentMethod(providerId: string) {
  const cartId = cookies().get("_medusa_cart_id")?.value

  if (!cartId) throw new Error("No cartId cookie found")

  try {
    const cart = await setPaymentSession({ cartId, providerId })
    revalidateTag("cart")
    return cart
  } catch (error: any) {
    throw error
  }
}

export async function placeOrder() {
  const cartId = cookies().get("_medusa_cart_id")?.value

  if (!cartId) throw new Error("No cartId cookie found")

  let cart

  try {
    cart = await completeCart(cartId)
    revalidateTag("cart")
  } catch (error: any) {
    throw error
  }

  if (cart?.type === "order") {
    const countryCode = cart.data.shipping_address?.country_code?.toLowerCase()
    cookies().set("_medusa_cart_id", "", { maxAge: -1 })
    redirect(`/${countryCode}/order/confirmed/${cart?.data.id}`)
  }

  return cart
}
```

Step 4. Add enviroment variables in the client

  NEXT_PUBLIC_RAZORPAY_KEY:<your razorpay key>
  NEXT_PUBLIC_SHOP_NAME:<your razorpay shop name>
  NEXT_PUBLIC_SHOP_DESCRIPTION: <your razorpayshop description>

## Contributing


Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)

## Untested features

These features exists, but without implementing the client it isn't possible to tests these outright

1. Capture Payment
2. Refund


## Disclaimer
The code was tested on limited number of usage scenarios. There maybe unforseen bugs, please raise the issues as they come, or create pull requests if you'd like to submit fixes.


## Support the Medusa-Payment-Razorpay Plugin - Strengthen Our Medusa Community!

Dear Medusa Enthusiasts,

I hope this message finds you all in high spirits and enthusiasm for the world of e-commerce! Today, I reach out to our vibrant Medusa community with a heartfelt appeal that will strengthen our collective journey and elevate our online stores to new heights. I am thrilled to present the Medusa-Payment-Razorpay plugin, a community-driven project designed to streamline payment processing for our beloved Medusa platform.

As a dedicated member of this community, I, SGFGOV, have invested my time and passion into crafting this valuable plugin that bridges the gap between online retailers and their customers. It is with great humility that I invite you to participate in this open-source initiative by [sponsoring the Medusa-Payment-Razorpay plugin through GitHub](https://github.com/sponsors/SGFGOV).

Your sponsorship, no matter the size, will make a world of difference in advancing the Medusa ecosystem. It will empower me to focus on the continuous improvement and maintenance of the Medusa-Payment-Razorpay plugin, ensuring it remains reliable, secure, and seamlessly integrated with Medusa.

Being a community plugin, perks are not the focus of this appeal. Instead, I promise to give back to the community by providing fast and efficient support via Discord or any other means. Your sponsorship will help sustain and enhance the plugin's development, allowing me to be responsive to your needs and address any concerns promptly.

Let's come together and demonstrate the power of community collaboration. By [sponsoring the Medusa-Payment-Razorpay plugin on GitHub](https://github.com/sponsors/SGFGOV), you directly contribute to the success of not only this project but also the broader Medusa ecosystem. Your support enables us to empower developers, merchants, and entrepreneurs, facilitating growth and success in the world of e-commerce.

To show your commitment and be part of this exciting journey, kindly consider [sponsoring the Medusa-Payment-Razorpay plugin on GitHub](https://github.com/sponsors/SGFGOV). Your contribution will amplify the impact of our community and foster a supportive environment for all.

Thank you for your time, and thank you for being an integral part of our Medusa community. Together, we will elevate our online stores and create extraordinary experiences for customers worldwide.

With warm regards,

SGFGOV
Lead Developer, Medusa-Payment-Razorpay Plugin for Medusa
