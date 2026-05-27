# QuantGuide Question

## 334. Light Bulb

**Metadata**

- ID: `2VuH4AEQ87wTlOFLXoXR`
- URL: https://www.quantguide.io/questions/light-bulb
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

You stand outside of a room that contains a light bulb. Next to you are four switches, one of which powers the light bulb. What is the least number of times you need to enter the room to figure out which switch powers the light bulb?

### Hint

What other characteristics of the light bulb can you test when you enter the room other than whether or not the bulb is on?

### 解答

Label the switches 1, 2, 3, and 4. Because there are four possible answers, you need at least two binary choices to differentiate between the results, one of which is entering the room to see if the light is on or off. The second will be if the bulb is warm. Our strategy will be to turn on switches 1 and 3 for 20 minutes, then turn off switch 3 and turn on switch 2. Thus, there are four possibilities from the two binary choices based on the characteristics of the bulb when we go into the room once:

$$\textrm{On and warm} \Rightarrow 1$$
$$\textrm{On and cold} \Rightarrow 2$$
$$\textrm{Off and warm} \Rightarrow 3$$
$$\textrm{Off and cold} \Rightarrow 4$$

Thus, we only need to enter the room once.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "difficulty": "easy",
    "id": "2VuH4AEQ87wTlOFLXoXR",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2564194,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Light Bulb",
    "topic": "brainteasers",
    "urlEnding": "light-bulb"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "2VuH4AEQ87wTlOFLXoXR",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Light Bulb",
    "topic": "brainteasers",
    "urlEnding": "light-bulb"
  }
}
```
