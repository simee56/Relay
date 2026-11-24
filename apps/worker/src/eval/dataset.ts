// A made-up "information page" for a bakery, with several different topics
export const documentText = `Green Garden Bakery - information for customers

Opening hours
We are open every day from 8 AM to 8 PM, including Sundays and public holidays. On Diwali the shop closes at 4 PM. The kitchen stops taking orders 30 minutes before closing.

Menu and prices
Veg pizza costs 249 rupees. Paneer pizza costs 299 rupees. Garlic bread costs 129 rupees. Fresh lime soda costs 59 rupees. Cold coffee costs 99 rupees. All pizzas are made with fresh dough every morning. We also make a vegan pizza with cashew cheese for 349 rupees. Extra cheese on any pizza costs 40 rupees.

Cakes
Birthday cakes need to be ordered at least 2 days in advance. A half kilogram chocolate cake costs 600 rupees and a one kilogram cake costs 1100 rupees. Eggless cakes cost the same. We can write a name or message on the cake for free.

Delivery
Home delivery is free for orders above 500 rupees. Below that, the delivery charge is 40 rupees. We deliver within 5 kilometres of the shop. Orders usually arrive within 30 to 40 minutes, but it can take longer when it rains or on busy evenings.

Payments
You can pay by cash, card or UPI. We do not accept cheques. Payment for delivery orders can be made at the door.

Cancellations and refunds
Pizza orders can be cancelled within 5 minutes of placing them. Cake orders can be cancelled up to 24 hours before pickup for a full refund. If a delivered item is wrong or damaged, call us within one hour and we will replace it or refund it.

Allergies and ingredients
Our pizzas contain gluten and milk. The vegan pizza contains cashew nuts. Our kitchen handles nuts, so we cannot promise that any item is completely free of nut traces.

Group orders
For orders of more than 10 pizzas, please call a day in advance. We give a 10 percent discount on group orders above 3000 rupees.

Location
The shop is on Station Road, next to the post office. There is no parking at the shop, but customers can park in the public lot behind the market.`;

export type EvalQuestion = {
  question: string;
  // A phrase that must appear inside a delivered chunk. Missing means the document has no answer.
  expected?: string;
  // The caller's earlier question, for follow-ups like "how much is it?"
  previous?: string;
};

export const questions: EvalQuestion[] = [
  // Questions the document can answer (worded differently from the document on purpose)
  { question: "What time do you open in the morning?", expected: "8 AM to 8 PM" },
  { question: "Are you open on Sundays?", expected: "including Sundays" },
  { question: "When does the shop close on Diwali?", expected: "Diwali the shop closes at 4 PM" },
  { question: "What does the paneer pizza cost?", expected: "Paneer pizza costs 299" },
  { question: "Do you have a vegan option?", expected: "vegan pizza with cashew cheese for 349" },
  { question: "How much extra for more cheese?", expected: "Extra cheese on any pizza costs 40" },
  { question: "How early do I need to order a birthday cake?", expected: "at least 2 days in advance" },
  { question: "Can you write a name on the cake?", expected: "write a name or message on the cake for free" },
  { question: "Is the delivery free if I order a lot?", expected: "free for orders above 500" },
  { question: "How far do you deliver?", expected: "within 5 kilometres" },
  { question: "How long does delivery take?", expected: "30 to 40 minutes" },
  { question: "Can I pay with Google Pay?", expected: "cash, card or UPI" },
  { question: "Can I cancel my pizza after ordering?", expected: "cancelled within 5 minutes" },
  { question: "What if my order arrives damaged?", expected: "wrong or damaged" },
  { question: "Is there any nut in the vegan pizza?", expected: "vegan pizza contains cashew nuts" },
  { question: "Do you give discounts for big orders?", expected: "10 percent discount on group orders" },
  { question: "Where is the shop located?", expected: "Station Road" },
  { question: "Where can I park?", expected: "public lot behind the market" },

  // Short follow-ups: they only make sense with the caller's earlier question
  { previous: "Do you have a vegan pizza?", question: "How much is it?", expected: "vegan pizza with cashew cheese for 349" },
  { previous: "Can I get a birthday cake?", question: "And how early?", expected: "at least 2 days in advance" },
  { previous: "Do you deliver to my area?", question: "Is it free?", expected: "free for orders above 500" },

  // Questions the document CANNOT answer: the right result is "nothing found"
  { question: "Do you have wifi for customers?" },
  { question: "Are you hiring any staff?" },
  { question: "Do you sell pasta?" },
  { question: "Do you serve alcohol?" },
  { question: "Is there a play area for children?" },
  { question: "What is the capital of France?" },
  { question: "Do you offer cooking classes?" },
];