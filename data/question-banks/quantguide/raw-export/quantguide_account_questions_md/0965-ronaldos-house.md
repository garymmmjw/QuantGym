# QuantGuide Question

## 965. Ronaldo's House

**Metadata**

- ID: `lxAdsMbKN1Vd1X11417d`
- URL: https://www.quantguide.io/questions/ronaldos-house
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG
- Source: og
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-29 09:01:40 America/New_York
- Last Edited By: Gabe

### 题干

Cristiano Ronaldo lives in Portugal in a house numbered $122577$. A hurricane hits Portugal, and two random numbers on Ronaldo's house fall off. After the hurricane passes, he sees the numbers on the ground, but has amnesia, so he doesn't remember what his house number is. Therefore, he places the two numbers up in the two empty spots uniformly at random. Find the probability Ronaldo creates the number $122577$ again. 

### Hint

The key here is to see that if either $22$ or $77$ falls off, then no matter how Ronaldo places up the numbers, he will get back the correct house number.

### 解答

The key here is to see that if either $22$ or $77$ falls off, then no matter how Ronaldo places up the numbers, he will get back the correct house number. If any other pair falls off, there is a $1/2$ chance of obtaining the correct house number. Therefore, let $S$ be the event that the two numbers that fall off are the same i.e. either $22$ or $77$ and $C$ be the event that Ronaldo puts up the numbers in the correct order again. By Law of Total Probability, $$\mathbb{P}[C] = \mathbb{P}[C \mid S]\mathbb{P}[S] + \mathbb{P}[C \mid S^c]\mathbb{P}[S^c]$$ There are $\displaystyle \binom{6}{2} = 15$ equally likely pairs of numbers to fall off, of which $2$ of them are $22$ or $77$, so $\mathbb{P}[S] = \dfrac{2}{15}$, meaning $\mathbb{P}[S^c] = \dfrac{13}{15}$. If the two numbers that fall off are the same, Ronaldo will be correct with probability $1$, so $\mathbb{P}[S \mid C] = 1$. If the numbers are not the same, he will be correct with probability $1/2$, as one of the two arrangements is the true house number, so $\mathbb{P}[C \mid S^c] = 1/2$. Adding all of these up, we get $$\mathbb{P}[C] = 1 \cdot \dfrac{2}{15} + \dfrac{1}{2} \cdot \dfrac{13}{15} = \dfrac{17}{30}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17/30"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "lxAdsMbKN1Vd1X11417d",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-29 09:01:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7871366,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Ronaldo's House",
    "topic": "probability",
    "urlEnding": "ronaldos-house",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "lxAdsMbKN1Vd1X11417d",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Ronaldo's House",
    "topic": "probability",
    "urlEnding": "ronaldos-house"
  }
}
```
