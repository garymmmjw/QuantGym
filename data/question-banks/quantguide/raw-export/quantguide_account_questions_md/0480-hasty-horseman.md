# QuantGuide Question

## 480. Hasty Horseman

**Metadata**

- ID: `nDjL7ZC2YZrtFxdmSluS`
- URL: https://www.quantguide.io/questions/hasty-horseman
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: 536
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 20:42:22 America/New_York
- Last Edited By: Gabe

### 题干

A linear army of people that is $50$ miles long walks $50$ miles while a horseman gallops from the back of the line to the front and then gallops to the back again. How far (in miles) has the horseman travelled? The answer is in the form $a(b+\sqrt{c})$ for integers $a,b,$ and $c$ with $a$ maximal. Find $abc$.

### Hint

Suppose the army moves at speed $1$ and the horseman moves at speed $s > 1$. Assume the amount of time it takes for the horseman to get from the back to the front is $t_1$ and then the time it takes for him to get to the back from the front is $t_2$. What is the distance travelled by the army and the horseman in terms of these values? Can you relate them in some way?

### 解答

Suppose the army moves at speed $1$ and the horseman moves at speed $s > 1$. Assume the amount of time it takes for the horseman to get from the back to the front is $t_1$ and then the time it takes for him to get to the back from the front is $t_2$. The distance travelled by the rider is $s(t_1 + t_2)$. The distance travelled by the army is $t_1 + t_2$, so $t_1 + t_2 = 50$. Therefore, we just need to find $s$.

$$$$

Relative to the crowd, the horseman moves at a speed of $s-1$ in the first leg and a speed of $s+1$ in the second leg when returning. Therefore, $t_1(s-1) = t_2(s+1) = 50$, as the horseman had to go from the back to the front in both cases relative to the line. This means that $t_1 = \dfrac{50}{s-1}$ and $t_2 = \dfrac{50}{s+1}$, so $50 = \dfrac{50}{s-1} + \dfrac{50}{s+1}$. Multiplying by $\dfrac{s^2-1}{50}$ on both sides and rearranging yields that $s$ satisfies $s^2-2s-1 = 0$, so $$s = \dfrac{2 \pm \sqrt{2^2 + 4}}{2} = 1 \pm \sqrt{2}$$ Since $s > 1$, we have that $s = 1 + \sqrt{2}$, so the distance that the horseman travels is $50(1 + \sqrt{2})$. Therefore, our answer is $50\cdot 2 \cdot 1 = 100$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "100"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "nDjL7ZC2YZrtFxdmSluS",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 20:42:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3835271,
    "source": "536",
    "status": "published",
    "tags": [],
    "title": "Hasty Horseman",
    "topic": "brainteasers",
    "urlEnding": "hasty-horseman",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "nDjL7ZC2YZrtFxdmSluS",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Hasty Horseman",
    "topic": "brainteasers",
    "urlEnding": "hasty-horseman"
  }
}
```
