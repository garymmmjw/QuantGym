# QuantGuide Question

## 130. Car Line

**Metadata**

- ID: `gq2tgFglClBl1XILtEwJ`
- URL: https://www.quantguide.io/questions/car-line
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: 536
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 22:37:49 America/New_York
- Last Edited By: Gabe

### 题干

Alice, Bob, and Carter are driving down a one-lane road in the same direction. Each car moves at some constant speed. In some instant, Alice is a distance $d$ behind Bob and Carter is a distance $2d$ in front of Bob. Alice passes Bob $7$ minutes after this instant. $5$ minutes after that, Alice passes Carter. How many seconds after Alice passes Carter would Bob pass Carter?

### Hint

Let $v_A, v_B,$ and $v_C$ be the speeds of Alice, Bob, and Carter, respectively. The idea here is to consider the relative speeds of the cars to one another. Alice starts a distance $d$ behind Bob, so $\dfrac{d}{v_A - v_B} = 7$. Repeat this for other distances. Write the time of interest in terms of $d$ and some of the velocities.

### 解答

Let $v_A, v_B,$ and $v_C$ be the speeds of Alice, Bob, and Carter, respectively. The idea here is to consider the relative speeds of the cars to one another. Alice starts a distance $d$ behind Bob, so $\dfrac{d}{v_A - v_B} = 7$. Alice starts a distance $3d$ behind Carter, so $\dfrac{3d}{v_A - v_C} = 12$, as it takes Alice a total of $12$ minutes from the instant to pass Carter. We want to find $t = \dfrac{2d}{v_B - v_C}$, the time it takes for Bob to catch up to Carter.

$$$$

We have that $d = 7(v_A - v_B) = 4(v_A - v_C) = \dfrac{t}{2}(v_B - v_C)$ by rearranging the equations above. However, note that $$v_B - v_C = (v_A - v_C)  - (v_A - v_B) = \dfrac{d}{4} - \dfrac{d}{7} = \dfrac{3}{28}d$$ Therefore, we have that $d = \dfrac{t}{2} \cdot \dfrac{3d}{28}  = \dfrac{3dt}{56}$, so $t = \dfrac{56}{3}$. In particular, this is $6$ minutes and $40$ seconds after Alice passes Carter (Alice passes at $12$ minutes). Therefore, our answer is $6 \cdot 60 + 40 = 400$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "400"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "gq2tgFglClBl1XILtEwJ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 22:37:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 902247,
    "source": "536",
    "status": "published",
    "tags": [],
    "title": "Car Line",
    "topic": "brainteasers",
    "urlEnding": "car-line",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "gq2tgFglClBl1XILtEwJ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Car Line",
    "topic": "brainteasers",
    "urlEnding": "car-line"
  }
}
```
