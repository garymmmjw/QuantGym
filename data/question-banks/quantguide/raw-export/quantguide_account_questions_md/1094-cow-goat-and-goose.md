# QuantGuide Question

## 1094. Cow, Goat, and Goose

**Metadata**

- ID: `01gttw9ZAOUL4QRlPX6E`
- URL: https://www.quantguide.io/questions/cow-goat-and-goose
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Puzzles_and_Curious_Problems
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-1 09:48:53 America/New_York
- Last Edited By: Gabe

### 题干

A farmer found that his cow and goat would eat all the grass in a certain field in $45$ days, that the cow and the goose would eat it in $60$ days, but that it would take the goat and the goose $90$ days to eat it down.

Now, if he had turned cow, goat, and goose into the field together, how long would it have taken them to eat all the grass?

### Hint

Write a system of equations

### 解答

Let $t$ be the number of days it takes for them to eat all the grass. Let $a, b, c$ be the eating rate in number of fields per day of (respectively) cow, goat, and goose. 

In $t$ days, the various contributions of each of the animals to the eating process is $at$, $bt$, $ct$ respectively. 

So for the total contribution to be $1$ field, we have:

$$(a + b+ c)t = 1 \Rightarrow t = \frac{1}{a+b+c}$$

We have the following system:
$$\begin{align*}
&a + b = \frac{1}{45}\\
&a + c = \frac{1}{60}\\ 
&b + c = \frac{1}{90}
\end{align*}$$

Solving the system, we obtain $a + b + c = \frac{1}{40}$ and so $t = 40$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "40"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "01gttw9ZAOUL4QRlPX6E",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-1 09:48:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8955272,
    "randomizable": "",
    "source": "Puzzles_and_Curious_Problems",
    "status": "published",
    "tags": [],
    "title": "Cow, Goat, and Goose",
    "topic": "brainteasers",
    "urlEnding": "cow-goat-and-goose",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "01gttw9ZAOUL4QRlPX6E",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Cow, Goat, and Goose",
    "topic": "brainteasers",
    "urlEnding": "cow-goat-and-goose"
  }
}
```
